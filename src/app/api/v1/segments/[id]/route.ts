import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { buildSegmentQuery, FilterRule } from "@/lib/segment-filter";

type RouteParams = { params: Promise<{ id: string }> };

const filterRuleSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
  ]),
  value: z.unknown().optional(),
});

const updateSegmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  filters: z.array(filterRuleSchema).optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const segment = await prisma.segment.findUnique({ where: { id } });
    if (!segment) {
      return errorResponse("Segment not found", 404);
    }

    let memberCount: number;
    if (segment.type === "DYNAMIC") {
      const where = buildSegmentQuery(segment.filters as FilterRule[]);
      memberCount = await prisma.contact.count({ where });
    } else {
      memberCount = await prisma.contactSegment.count({
        where: { segmentId: id },
      });
    }

    return jsonResponse({ ...segment, memberCount });
  } catch {
    return errorResponse("Failed to fetch segment", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSegmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.segment.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Segment not found", 404);
    }

    const { filters, ...data } = parsed.data;

    const segment = await prisma.segment.update({
      where: { id },
      data: {
        ...data,
        ...(filters !== undefined && {
          filters: filters as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    return jsonResponse(segment);
  } catch {
    return errorResponse("Failed to update segment", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const existing = await prisma.segment.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Segment not found", 404);
    }

    await prisma.segment.delete({ where: { id } });

    return jsonResponse({ message: "Segment deleted" });
  } catch {
    return errorResponse("Failed to delete segment", 500);
  }
}
