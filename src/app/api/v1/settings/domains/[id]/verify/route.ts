import { NextRequest } from "next/server";
import dns from "dns";
import { promisify } from "util";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

async function checkSPF(domain: string): Promise<boolean> {
  try {
    const records = await resolveTxt(domain);
    return records.some((r) =>
      r.join("").toLowerCase().includes("v=spf1")
    );
  } catch {
    return false;
  }
}

const DEFAULT_DKIM_SELECTORS = [
  "default",
  "google",
  "selector1",
  "selector2",
  "k1",
  "mail",
];

async function checkDkimAtSelector(
  domain: string,
  selector: string
): Promise<boolean> {
  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const records = await resolveTxt(dkimDomain);
    if (records.some((r) => r.join("").toLowerCase().includes("v=dkim1"))) {
      return true;
    }
  } catch {
    // TXT not found or invalid
  }

  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    await resolveCname(dkimDomain);
    return true;
  } catch {
    // CNAME not found
  }

  return false;
}

async function checkDKIM(
  domain: string,
  dkimSelector: string | null
): Promise<boolean> {
  const trimmed = dkimSelector?.trim();
  if (trimmed) {
    return checkDkimAtSelector(domain, trimmed);
  }

  for (const selector of DEFAULT_DKIM_SELECTORS) {
    if (await checkDkimAtSelector(domain, selector)) {
      return true;
    }
  }

  return false;
}

async function checkDMARC(domain: string): Promise<boolean> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`);
    return records.some((r) =>
      r.join("").toLowerCase().includes("v=dmarc1")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const domain = await prisma.sendingDomain.findUnique({ where: { id } });
    if (!domain) {
      return errorResponse("Domain not found", 404);
    }

    const [spfValid, dkimValid, dmarcValid] = await Promise.all([
      checkSPF(domain.domain),
      checkDKIM(domain.domain, domain.dkimSelector),
      checkDMARC(domain.domain),
    ]);

    const allValid = spfValid && dkimValid && dmarcValid;

    const updated = await prisma.sendingDomain.update({
      where: { id },
      data: {
        spfValid,
        dkimValid,
        dmarcValid,
        status: allValid ? "VERIFIED" : domain.status === "PENDING" ? "PENDING" : domain.status,
      },
    });

    return jsonResponse({
      domain: updated,
      checks: {
        spf: { valid: spfValid, record: `v=spf1 include:... ~all` },
        dkim: {
          valid: dkimValid,
          record: `${domain.dkimSelector?.trim() || "selector"}._domainkey.${domain.domain}`,
        },
        dmarc: { valid: dmarcValid, record: `_dmarc.${domain.domain}` },
      },
    });
  } catch {
    return errorResponse("Failed to verify domain", 500);
  }
}
