import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyScoring } from "@/lib/tracking/scoring";

const pageViewSchema = z.object({
  url: z.string().url(),
  referrer: z.string().optional(),
  title: z.string().optional(),
  contactId: z.string().optional().nullable(),
  event: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = pageViewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { url, referrer, title, contactId, event, data } = parsed.data;

    await prisma.trackingEvent.create({
      data: {
        type: "PAGE_VIEW",
        contactId: contactId || undefined,
        data: { url, referrer, title, event, ...data },
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    if (contactId) {
      await applyScoring(contactId, "PAGE_VIEW");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to track page view" },
      { status: 500 }
    );
  }
}
