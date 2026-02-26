import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) return errorResponse("Campaign not found", 404);
    if (campaign.status !== "ACTIVE") {
      return errorResponse("Can only pause an active campaign", 400);
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "PAUSED" },
    });

    return jsonResponse({ message: "Campaign paused", status: "PAUSED" });
  } catch {
    return errorResponse("Failed to pause campaign", 500);
  }
}
