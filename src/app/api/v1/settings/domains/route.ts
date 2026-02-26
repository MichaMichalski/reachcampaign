import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format"),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const domains = await prisma.sendingDomain.findMany({
      include: { warmup: true, providers: { include: { provider: true } } },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ data: domains });
  } catch {
    return errorResponse("Failed to fetch domains", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createDomainSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.sendingDomain.findUnique({
      where: { domain: parsed.data.domain },
    });
    if (existing) {
      return errorResponse("Domain already exists", 409);
    }

    const domain = await prisma.sendingDomain.create({
      data: {
        domain: parsed.data.domain,
        status: "PENDING",
        warmup: {
          create: {
            enabled: true,
            currentDay: 1,
            dailyTarget: 50,
          },
        },
      },
      include: { warmup: true },
    });

    return jsonResponse(domain, 201);
  } catch {
    return errorResponse("Failed to create domain", 500);
  }
}
