import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

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

const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { nodes: true, logs: true } },
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

    const { name, description, nodes: nodeData, edges: edgeData } = parsed.data;

    const campaign = await prisma.campaign.create({
      data: { name, description },
    });

    const createdNodes = await Promise.all(
      nodeData.map((n) =>
        prisma.campaignNode.create({
          data: {
            campaignId: campaign.id,
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

    if (edgeData.length > 0) {
      await prisma.campaignEdge.createMany({
        data: edgeData.map((e) => ({
          campaignId: campaign.id,
          sourceNodeId: createdNodes[e.sourceNodeIndex].id,
          targetNodeId: createdNodes[e.targetNodeIndex].id,
          label: e.label,
        })),
      });
    }

    const result = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { nodes: true, edges: true },
    });

    return jsonResponse(result, 201);
  } catch {
    return errorResponse("Failed to create campaign", 500);
  }
}
