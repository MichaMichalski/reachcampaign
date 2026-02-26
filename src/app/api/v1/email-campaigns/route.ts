import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { getCampaignQueue } from "@/lib/queue";

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  templateId: z.string().min(1, "Template ID is required"),
  segmentIds: z.array(z.string()).min(1, "At least one segment is required"),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { id: true, name: true, subject: true } },
      },
    });
    return jsonResponse(campaigns);
  } catch {
    return errorResponse("Failed to fetch campaigns", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { name, templateId, segmentIds, scheduledAt } = parsed.data;

    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) return errorResponse("Template not found", 404);

    const isScheduled = !!scheduledAt;

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        templateId,
        segmentIds,
        status: isScheduled ? "SCHEDULED" : "SENDING",
        scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
      },
    });

    if (!isScheduled) {
      await getCampaignQueue().add("send-campaign", {
        campaignId: campaign.id,
      });
    } else {
      const delay =
        new Date(scheduledAt).getTime() - Date.now();
      await getCampaignQueue().add(
        "send-campaign",
        { campaignId: campaign.id },
        { delay: Math.max(delay, 0) }
      );
    }

    return jsonResponse(campaign, 201);
  } catch {
    return errorResponse("Failed to create campaign", 500);
  }
}
