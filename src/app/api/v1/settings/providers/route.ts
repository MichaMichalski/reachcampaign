import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createProviderSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SMTP", "SENDGRID", "AWS_SES", "MAILGUN", "POSTMARK"]),
  config: z.record(z.string(), z.unknown()),
  weight: z.number().int().positive().optional(),
  priority: z.number().int().min(0).optional(),
  strategy: z.enum(["ROUND_ROBIN", "WEIGHTED", "FAILOVER"]).optional(),
  dailyLimit: z.number().int().positive().optional(),
  hourlyLimit: z.number().int().positive().optional(),
  domainIds: z.array(z.string()).optional(),
});

function maskConfig(config: unknown): Record<string, unknown> {
  const raw = typeof config === "string" ? {} : (config as Record<string, unknown>);
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (
      typeof value === "string" &&
      ["pass", "password", "apiKey", "secret", "key"].some((s) =>
        key.toLowerCase().includes(s.toLowerCase())
      )
    ) {
      masked[key] = value.length > 4 ? `${"*".repeat(value.length - 4)}${value.slice(-4)}` : "****";
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const providers = await prisma.emailProvider.findMany({
      include: { domains: { include: { domain: true } } },
      orderBy: { createdAt: "desc" },
    });

    const safe = providers.map((p) => ({
      ...p,
      config: maskConfig(p.config),
    }));

    return jsonResponse({ data: safe });
  } catch {
    return errorResponse("Failed to fetch providers", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createProviderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { config, domainIds, hourlyLimit, ...rest } = parsed.data;

    const encryptedConfig = encrypt(JSON.stringify(config));

    const provider = await prisma.emailProvider.create({
      data: {
        ...rest,
        config: encryptedConfig,
        hourlylimit: hourlyLimit ?? 500,
        ...(domainIds?.length && {
          domains: {
            create: domainIds.map((domainId) => ({ domainId })),
          },
        }),
      },
      include: { domains: { include: { domain: true } } },
    });

    return jsonResponse(
      { ...provider, config: maskConfig(config) },
      201
    );
  } catch {
    return errorResponse("Failed to create provider", 500);
  }
}
