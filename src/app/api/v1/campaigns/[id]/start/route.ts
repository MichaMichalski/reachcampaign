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
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { nodes: true },
    });

    if (!campaign) return errorResponse("Campaign not found", 404);
    if (campaign.status !== "DRAFT" && campaign.status !== "PAUSED") {
      return errorResponse(
        `Cannot start campaign with status ${campaign.status}`,
        400
      );
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    const triggerNodes = campaign.nodes.filter((n) => n.type === "TRIGGER");

    for (const trigger of triggerNodes) {
      const config = trigger.config as Record<string, unknown>;

      if (config.triggerType === "segment_entry" && config.segmentId) {
        const members = await prisma.contactSegment.findMany({
          where: { segmentId: config.segmentId as string },
          select: { contactId: true },
        });

        for (const member of members) {
          await getCampaignQueue().add(
            `campaign-${id}-${trigger.id}-${member.contactId}`,
            {
              campaignId: id,
              nodeId: trigger.id,
              contactId: member.contactId,
            }
          );
        }
      }
    }

    return jsonResponse({ message: "Campaign started", status: "ACTIVE" });
  } catch {
    return errorResponse("Failed to start campaign", 500);
  }
}
