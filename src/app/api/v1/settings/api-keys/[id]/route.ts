import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.userId !== authResult.ctx.userId) {
      return errorResponse("API key not found", 404);
    }

    await prisma.apiKey.delete({ where: { id } });

    return jsonResponse({ message: "API key deleted" });
  } catch {
    return errorResponse("Failed to delete API key", 500);
  }
}
