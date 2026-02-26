import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { paginationMeta } from "@/lib/utils";
import type { TrackingEventType } from "@prisma/client";

const VALID_TYPES: TrackingEventType[] = [
  "EMAIL_OPEN",
  "EMAIL_CLICK",
  "PAGE_VIEW",
  "FORM_SUBMIT",
  "CAMPAIGN_TRIGGER",
];

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("perPage") ?? "20"))
    );
    const type = url.searchParams.get("type") as TrackingEventType | null;
    const contactId = url.searchParams.get("contactId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (type && VALID_TYPES.includes(type)) {
      where.type = type;
    }
    if (contactId) {
      where.contactId = contactId;
    }
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    const [events, total] = await Promise.all([
      prisma.trackingEvent.findMany({
        where,
        include: {
          contact: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.trackingEvent.count({ where }),
    ]);

    return jsonResponse({
      data: events,
      meta: paginationMeta(total, page, perPage),
    });
  } catch {
    return errorResponse("Failed to fetch tracking events", 500);
  }
}
