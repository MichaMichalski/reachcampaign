import { prisma } from "@/lib/db";
import type { TrackingEventType } from "@prisma/client";

export async function applyScoring(
  contactId: string,
  eventType: TrackingEventType
): Promise<void> {
  const rule = await prisma.scoringRule.findFirst({
    where: { eventType, enabled: true },
  });

  if (!rule || rule.points === 0) return;

  await prisma.contact.update({
    where: { id: contactId },
    data: { score: { increment: rule.points } },
  });
}
