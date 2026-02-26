import { prisma } from "@/lib/db";
import type { SendingDomain } from "@prisma/client";

const BOUNCE_RATE_THRESHOLD = 0.05;
const COMPLAINT_RATE_THRESHOLD = 0.001;

let domainRobinIndex = 0;

export async function selectDomain(
  segmentSize?: number
): Promise<SendingDomain | null> {
  await resetDailyCounters();

  const domains = await prisma.sendingDomain.findMany({
    where: {
      status: "VERIFIED",
    },
    include: { warmup: true },
  });

  const eligible = domains.filter((domain) => {
    const warmup = domain.warmup;
    const effectiveLimit =
      warmup?.enabled ? warmup.dailyTarget : domain.maxDailyVolume;
    const remaining = effectiveLimit - domain.dailySent;

    if (remaining <= 0) return false;
    if (segmentSize && remaining < segmentSize) return false;

    return true;
  });

  if (eligible.length === 0) return null;

  const idx = domainRobinIndex % eligible.length;
  domainRobinIndex++;

  return eligible[idx];
}

export async function resetDailyCounters(): Promise<void> {
  const now = new Date();

  await prisma.sendingDomain.updateMany({
    where: { dailyResetAt: { lt: now } },
    data: {
      dailySent: 0,
      dailyResetAt: startOfTomorrow(),
    },
  });

  await prisma.emailProvider.updateMany({
    where: { dailyResetAt: { lt: now } },
    data: {
      dailySent: 0,
      dailyResetAt: startOfTomorrow(),
    },
  });
}

function startOfTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function updateDomainHealth(domainId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalSent, bounced, complained] = await Promise.all([
    prisma.emailLog.count({
      where: {
        domainId,
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "COMPLAINED"] },
      },
    }),
    prisma.emailLog.count({
      where: {
        domainId,
        createdAt: { gte: thirtyDaysAgo },
        status: "BOUNCED",
      },
    }),
    prisma.emailLog.count({
      where: {
        domainId,
        createdAt: { gte: thirtyDaysAgo },
        status: "COMPLAINED",
      },
    }),
  ]);

  if (totalSent === 0) return;

  const bounceRate = bounced / totalSent;
  const complaintRate = complained / totalSent;

  const shouldPause =
    bounceRate > BOUNCE_RATE_THRESHOLD ||
    complaintRate > COMPLAINT_RATE_THRESHOLD;

  await prisma.sendingDomain.update({
    where: { id: domainId },
    data: {
      bounceRate,
      ...(shouldPause ? { status: "PAUSED" } : {}),
    },
  });
}
