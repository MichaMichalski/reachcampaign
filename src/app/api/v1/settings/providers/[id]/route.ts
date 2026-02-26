import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["SMTP", "SENDGRID", "AWS_SES", "MAILGUN", "POSTMARK"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  weight: z.number().int().positive().optional(),
  priority: z.number().int().min(0).optional(),
  strategy: z.enum(["ROUND_ROBIN", "WEIGHTED", "FAILOVER"]).optional(),
  dailyLimit: z.number().int().positive().optional(),
  hourlyLimit: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
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

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const provider = await prisma.emailProvider.findUnique({
      where: { id },
      include: { domains: { include: { domain: true } } },
    });

    if (!provider) {
      return errorResponse("Provider not found", 404);
    }

    return jsonResponse({ ...provider, config: maskConfig(provider.config) });
  } catch {
    return errorResponse("Failed to fetch provider", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateProviderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.emailProvider.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Provider not found", 404);
    }

    const { config, domainIds, hourlyLimit, ...rest } = parsed.data;

    const updateData: Record<string, unknown> = { ...rest };

    if (config) {
      updateData.config = encrypt(JSON.stringify(config));
    }

    if (hourlyLimit !== undefined) {
      updateData.hourlylimit = hourlyLimit;
    }

    if (domainIds) {
      await prisma.domainProvider.deleteMany({ where: { providerId: id } });
      if (domainIds.length) {
        await prisma.domainProvider.createMany({
          data: domainIds.map((domainId) => ({ domainId, providerId: id })),
        });
      }
    }

    const provider = await prisma.emailProvider.update({
      where: { id },
      data: updateData,
      include: { domains: { include: { domain: true } } },
    });

    return jsonResponse({ ...provider, config: maskConfig(provider.config) });
  } catch {
    return errorResponse("Failed to update provider", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const existing = await prisma.emailProvider.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Provider not found", 404);
    }

    await prisma.emailProvider.delete({ where: { id } });

    return jsonResponse({ message: "Provider deleted" });
  } catch {
    return errorResponse("Failed to delete provider", 500);
  }
}
