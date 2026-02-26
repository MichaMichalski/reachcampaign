import { NextRequest, NextResponse } from "next/server";
import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/db";
import { authenticateApi, errorResponse } from "@/lib/api-auth";
import { buildSegmentQuery, FilterRule } from "@/lib/segment-filter";

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = req.nextUrl;
    const segmentId = url.searchParams.get("segmentId");
    const tag = url.searchParams.get("tag");

    let where: Record<string, unknown> = {};

    if (segmentId) {
      const segment = await prisma.segment.findUnique({
        where: { id: segmentId },
      });
      if (!segment) {
        return errorResponse("Segment not found", 404);
      }
      if (segment.type === "DYNAMIC") {
        where = buildSegmentQuery(segment.filters as FilterRule[]);
      } else {
        where = {
          segmentMemberships: { some: { segmentId } },
        };
      }
    }

    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = contacts.map((c) => ({
      email: c.email,
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      title: c.title ?? "",
      score: c.score,
      doNotContact: c.doNotContact,
      tags: c.tags.map((ct) => ct.tag.name).join(";"),
      createdAt: c.createdAt.toISOString(),
    }));

    const csv = stringify(rows, {
      header: true,
      columns: [
        "email",
        "firstName",
        "lastName",
        "phone",
        "company",
        "title",
        "score",
        "doNotContact",
        "tags",
        "createdAt",
      ],
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="contacts.csv"',
      },
    });
  } catch {
    return errorResponse("Failed to export contacts", 500);
  }
}
