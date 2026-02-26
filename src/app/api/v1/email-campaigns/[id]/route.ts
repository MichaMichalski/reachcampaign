import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  segmentIds: z.array(z.string()).min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true, subject: true } },
      },
    });
    if (!campaign) return errorResponse("Campaign not found", 404);
    return jsonResponse(campaign);
  } catch {
    return errorResponse("Failed to fetch campaign", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) return errorResponse("Campaign not found", 404);

    if (existing.status !== "DRAFT" && existing.status !== "SCHEDULED") {
      return errorResponse(
        "Only DRAFT or SCHEDULED campaigns can be updated",
        400
      );
    }

    const body = await req.json();
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { scheduledAt, ...data } = parsed.data;

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        ...data,
        ...(scheduledAt !== undefined && {
          scheduledAt: new Date(scheduledAt),
        }),
      },
    });

    return jsonResponse(campaign);
  } catch {
    return errorResponse("Failed to update campaign", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) return errorResponse("Campaign not found", 404);

    await prisma.emailCampaign.delete({ where: { id } });
    return jsonResponse({ message: "Campaign deleted" });
  } catch {
    return errorResponse("Failed to delete campaign", 500);
  }
}
