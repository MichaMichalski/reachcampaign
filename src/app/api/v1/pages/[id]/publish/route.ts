import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) return errorResponse("Page not found", 404);

    const page = await prisma.landingPage.update({
      where: { id },
      data: { published: true, publishedAt: new Date() },
    });

    return jsonResponse(page);
  } catch {
    return errorResponse("Failed to publish page", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) return errorResponse("Page not found", 404);

    const page = await prisma.landingPage.update({
      where: { id },
      data: { published: false },
    });

    return jsonResponse(page);
  } catch {
    return errorResponse("Failed to unpublish page", 500);
  }
}
