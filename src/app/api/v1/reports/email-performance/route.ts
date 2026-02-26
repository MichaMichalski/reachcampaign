import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const days = Math.min(
      90,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30"))
    );

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await prisma.emailLog.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true, createdAt: true },
    });

    const dayMap = new Map<
      string,
      { sent: number; opened: number; clicked: number; bounced: number }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { sent: 0, opened: 0, clicked: 0, bounced: 0 });
    }

    for (const log of logs) {
      const key = log.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (!entry) continue;

      if (["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(log.status)) {
        entry.sent++;
      }
      if (["OPENED", "CLICKED"].includes(log.status)) {
        entry.opened++;
      }
      if (log.status === "CLICKED") {
        entry.clicked++;
      }
      if (log.status === "BOUNCED") {
        entry.bounced++;
      }
    }

    const data = Array.from(dayMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return jsonResponse({ data });
  } catch {
    return errorResponse("Failed to fetch email performance data", 500);
  }
}
