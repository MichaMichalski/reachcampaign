import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

/** DKIM selector label (left of ._domainkey); letters, digits, dots, hyphens, underscores. */
const dkimSelectorSchema = z
  .string()
  .trim()
  .max(63)
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
    "Invalid DKIM selector format"
  );

const updateDomainSchema = z.object({
  maxDailyVolume: z.number().int().positive().optional(),
  status: z.enum(["PENDING", "VERIFIED", "FAILED", "PAUSED"]).optional(),
  dkimSelector: z
    .union([z.string(), z.null()])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const t = val.trim();
      if (t === "") return null;
      return dkimSelectorSchema.parse(t);
    }),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const domain = await prisma.sendingDomain.findUnique({
      where: { id },
      include: {
        warmup: true,
        providers: { include: { provider: true } },
        emailLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            toEmail: true,
            subject: true,
            createdAt: true,
          },
        },
      },
    });

    if (!domain) {
      return errorResponse("Domain not found", 404);
    }

    return jsonResponse(domain);
  } catch {
    return errorResponse("Failed to fetch domain", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateDomainSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.sendingDomain.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Domain not found", 404);
    }

    const domain = await prisma.sendingDomain.update({
      where: { id },
      data: parsed.data,
      include: { warmup: true },
    });

    return jsonResponse(domain);
  } catch {
    return errorResponse("Failed to update domain", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const existing = await prisma.sendingDomain.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Domain not found", 404);
    }

    await prisma.sendingDomain.delete({ where: { id } });

    return jsonResponse({ message: "Domain deleted" });
  } catch {
    return errorResponse("Failed to delete domain", 500);
  }
}
