import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const nodeSchema = z.object({
  type: z.enum(["TRIGGER", "CONDITION", "ACTION", "DELAY"]),
  label: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  templateId: z.string().nullable().optional(),
  segmentId: z.string().nullable().optional(),
});

const edgeSchema = z.object({
  sourceNodeIndex: z.number(),
  targetNodeIndex: z.number(),
  label: z.string().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        nodes: { orderBy: { createdAt: "asc" } },
        edges: true,
        logs: {
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            node: { select: { id: true, label: true, type: true } },
          },
        },
        _count: { select: { logs: true } },
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
    const body = await req.json();
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return errorResponse("Campaign not found", 404);

    const { nodes: nodeData, edges: edgeData, ...campaignUpdate } = parsed.data;

    if (Object.keys(campaignUpdate).length > 0) {
      await prisma.campaign.update({
        where: { id },
        data: campaignUpdate,
      });
    }

    if (nodeData) {
      await prisma.campaignEdge.deleteMany({ where: { campaignId: id } });
      await prisma.campaignNode.deleteMany({ where: { campaignId: id } });

      const createdNodes = await Promise.all(
        nodeData.map((n) =>
          prisma.campaignNode.create({
            data: {
              campaignId: id,
              type: n.type,
              label: n.label,
              config: n.config as Prisma.InputJsonValue,
              positionX: n.positionX,
              positionY: n.positionY,
              templateId: n.templateId || null,
              segmentId: n.segmentId || null,
            },
          })
        )
      );

      if (edgeData && edgeData.length > 0) {
        await prisma.campaignEdge.createMany({
          data: edgeData.map((e) => ({
            campaignId: id,
            sourceNodeId: createdNodes[e.sourceNodeIndex].id,
            targetNodeId: createdNodes[e.targetNodeIndex].id,
            label: e.label,
          })),
        });
      }
    }

    const result = await prisma.campaign.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });

    return jsonResponse(result);
  } catch {
    return errorResponse("Failed to update campaign", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) return errorResponse("Campaign not found", 404);

    await prisma.campaign.delete({ where: { id } });
    return jsonResponse({ message: "Campaign deleted" });
  } catch {
    return errorResponse("Failed to delete campaign", 500);
  }
}
