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
    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) return errorResponse("Campaign not found", 404);
    if (campaign.status === "COMPLETED") {
      return errorResponse("Campaign is already completed", 400);
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    await prisma.campaignLog.updateMany({
      where: {
        campaignId: id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: { status: "SKIPPED" },
    });

    const queue = getCampaignQueue();
    const waiting = await queue.getWaiting();
    const delayed = await queue.getDelayed();
    const campaignJobs = [...waiting, ...delayed].filter(
      (j) => j.data?.campaignId === id
    );
    await Promise.allSettled(campaignJobs.map((j) => j.remove()));

    return jsonResponse({ message: "Campaign stopped", status: "COMPLETED" });
  } catch {
    return errorResponse("Failed to stop campaign", 500);
  }
}
