import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/utils";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

function maskKey(key: string): string {
  if (key.length <= 10) return "****";
  return `${key.slice(0, 6)}${"*".repeat(key.length - 10)}${key.slice(-4)}`;
}

const createKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: authResult.ctx.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const data = keys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey: maskKey(k.key),
      lastUsed: k.lastUsed,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));

    return jsonResponse({ data });
  } catch {
    return errorResponse("Failed to fetch API keys", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        name: parsed.data.name,
        key,
        userId: authResult.ctx.userId,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
      },
    });

    return jsonResponse(
      {
        id: apiKey.id,
        name: apiKey.name,
        key,
        createdAt: apiKey.createdAt,
      },
      201
    );
  } catch {
    return errorResponse("Failed to create API key", 500);
  }
}
