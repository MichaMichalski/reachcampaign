import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyScoring } from "@/lib/tracking/scoring";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let targetUrl = "/";

  try {
    const decoded = JSON.parse(
      Buffer.from(decodeURIComponent(id), "base64").toString("utf-8")
    ) as { emailLogId?: string; url?: string };

    targetUrl = decoded.url || "/";

    if (decoded.emailLogId) {
      const emailLog = await prisma.emailLog.findUnique({
        where: { id: decoded.emailLogId },
      });

      if (emailLog) {
        const updateData: Record<string, unknown> = {};

        if (["SENT", "DELIVERED", "OPENED"].includes(emailLog.status)) {
          updateData.status = "CLICKED";
        }
        if (!emailLog.clickedAt) {
          updateData.clickedAt = new Date();
        }
        if (!emailLog.openedAt) {
          updateData.openedAt = new Date();
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.emailLog.update({
            where: { id: decoded.emailLogId },
            data: updateData,
          });
        }

        await prisma.trackingEvent.create({
          data: {
            type: "EMAIL_CLICK",
            contactId: emailLog.contactId,
            data: { emailLogId: decoded.emailLogId, url: targetUrl },
            ip: req.headers.get("x-forwarded-for") ?? undefined,
            userAgent: req.headers.get("user-agent") ?? undefined,
          },
        });

        await applyScoring(emailLog.contactId, "EMAIL_CLICK");
      }
    }
  } catch {
    // Tracking failures should not block the redirect
  }

  return NextResponse.redirect(targetUrl, 302);
}
