import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { buildSegmentQuery, FilterRule } from "@/lib/segment-filter";

type RouteParams = { params: Promise<{ id: string }> };

const modifyMembersSchema = z.object({
  contactIds: z.array(z.string()).min(1, "At least one contact ID is required"),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("perPage") ?? "20"))
    );

    const segment = await prisma.segment.findUnique({ where: { id } });
    if (!segment) {
      return errorResponse("Segment not found", 404);
    }

    let contacts;
    let total: number;

    if (segment.type === "DYNAMIC") {
      const where = buildSegmentQuery(segment.filters as FilterRule[]);
      [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: { createdAt: "desc" },
        }),
        prisma.contact.count({ where }),
      ]);
    } else {
      const memberWhere = { segmentId: id };
      [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where: { segmentMemberships: { some: memberWhere } },
          include: { tags: { include: { tag: true } } },
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: { createdAt: "desc" },
        }),
        prisma.contactSegment.count({ where: memberWhere }),
      ]);
    }

    return jsonResponse({
      data: contacts,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch {
    return errorResponse("Failed to fetch segment members", 500);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const segment = await prisma.segment.findUnique({ where: { id } });
    if (!segment) {
      return errorResponse("Segment not found", 404);
    }
    if (segment.type !== "STATIC") {
      return errorResponse(
        "Cannot manually add members to a dynamic segment",
        400
      );
    }

    const body = await req.json();
    const parsed = modifyMembersSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { contactIds } = parsed.data;

    await prisma.contactSegment.createMany({
      data: contactIds.map((contactId) => ({ contactId, segmentId: id })),
      skipDuplicates: true,
    });

    const count = await prisma.contactSegment.count({
      where: { segmentId: id },
    });

    return jsonResponse({ message: "Members added", memberCount: count });
  } catch {
    return errorResponse("Failed to add segment members", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const segment = await prisma.segment.findUnique({ where: { id } });
    if (!segment) {
      return errorResponse("Segment not found", 404);
    }
    if (segment.type !== "STATIC") {
      return errorResponse(
        "Cannot manually remove members from a dynamic segment",
        400
      );
    }

    const body = await req.json();
    const parsed = modifyMembersSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { contactIds } = parsed.data;

    await prisma.contactSegment.deleteMany({
      where: {
        segmentId: id,
        contactId: { in: contactIds },
      },
    });

    const count = await prisma.contactSegment.count({
      where: { segmentId: id },
    });

    return jsonResponse({ message: "Members removed", memberCount: count });
  } catch {
    return errorResponse("Failed to remove segment members", 500);
  }
}
