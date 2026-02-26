import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyScoring } from "@/lib/tracking/scoring";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: emailLogId } = await params;

  try {
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (emailLog) {
      const updateData: Record<string, unknown> = {};

      if (["SENT", "DELIVERED"].includes(emailLog.status)) {
        updateData.status = "OPENED";
      }
      if (!emailLog.openedAt) {
        updateData.openedAt = new Date();
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: updateData,
        });
      }

      await prisma.trackingEvent.create({
        data: {
          type: "EMAIL_OPEN",
          contactId: emailLog.contactId,
          data: { emailLogId },
          ip: req.headers.get("x-forwarded-for") ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      });

      await applyScoring(emailLog.contactId, "EMAIL_OPEN");
    }
  } catch {
    // Tracking failures should not break the pixel response
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
