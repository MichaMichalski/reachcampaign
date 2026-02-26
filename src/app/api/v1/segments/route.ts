import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { buildSegmentQuery, FilterRule } from "@/lib/segment-filter";

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

const createSegmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["DYNAMIC", "STATIC"]),
  filters: z.array(filterRuleSchema).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: "desc" },
    });

    const segmentsWithCounts = await Promise.all(
      segments.map(async (segment) => {
        let memberCount: number;

        if (segment.type === "DYNAMIC") {
          const where = buildSegmentQuery(segment.filters as FilterRule[]);
          memberCount = await prisma.contact.count({ where });
        } else {
          memberCount = await prisma.contactSegment.count({
            where: { segmentId: segment.id },
          });
        }

        return { ...segment, memberCount };
      })
    );

    return jsonResponse(segmentsWithCounts);
  } catch {
    return errorResponse("Failed to fetch segments", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createSegmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { filters, ...data } = parsed.data;

    const segment = await prisma.segment.create({
      data: {
        ...data,
        filters: ((filters as FilterRule[]) ?? []) as unknown as Prisma.InputJsonValue,
      },
    });

    return jsonResponse(segment, 201);
  } catch {
    return errorResponse("Failed to create segment", 500);
  }
}
