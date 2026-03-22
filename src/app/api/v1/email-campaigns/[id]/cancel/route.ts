import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { getCampaignQueue } from "@/lib/queue";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });

    if (!existing) return errorResponse("Campaign not found", 404);
    if (existing.status === "SENT" || existing.status === "CANCELLED") {
      return errorResponse(
        `Cannot cancel campaign with status ${existing.status}`,
        400
      );
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    const queue = getCampaignQueue();
    const waiting = await queue.getWaiting();
    const delayed = await queue.getDelayed();
    const campaignJobs = [...waiting, ...delayed].filter(
      (j) => j.data?.campaignId === id
    );
    await Promise.allSettled(campaignJobs.map((j) => j.remove()));

    return jsonResponse({ message: "Campaign cancelled", status: "CANCELLED" });
  } catch {
    return errorResponse("Failed to cancel campaign", 500);
  }
}
