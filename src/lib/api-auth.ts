import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ApiContext = {
  userId: string;
};

export async function authenticateApi(
  req: NextRequest
): Promise<{ ctx: ApiContext } | { error: NextResponse }> {
  const apiKey = req.headers.get("x-api-key");

  if (apiKey) {
    const key = await prisma.apiKey.findUnique({ where: { key: apiKey } });
    if (!key) {
      return {
        error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
      };
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      return {
        error: NextResponse.json({ error: "API key expired" }, { status: 401 }),
      };
    }
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    });
    return { ctx: { userId: key.userId } };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ctx: { userId: session.user.id } };
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
