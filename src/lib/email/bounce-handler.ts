import { prisma } from "@/lib/db";
import { updateDomainHealth } from "./domain-rotation";

type BounceParams = {
  messageId: string;
  bounceType: "hard" | "soft";
  reason?: string;
};

type ComplaintParams = {
  messageId: string;
  reason?: string;
};

export async function handleBounce({
  messageId,
  bounceType,
  reason,
}: BounceParams): Promise<void> {
  const emailLog = await prisma.emailLog.findFirst({
    where: { messageId },
  });

  if (!emailLog) return;

  await prisma.emailLog.update({
    where: { id: emailLog.id },
    data: {
      status: "BOUNCED",
      bouncedAt: new Date(),
      bounceType,
      error: reason,
    },
  });

  if (bounceType === "hard") {
    await prisma.contact.update({
      where: { id: emailLog.contactId },
      data: { doNotContact: true },
    });
  }

  if (emailLog.domainId) {
    await updateDomainHealth(emailLog.domainId);
  }

  if (emailLog.campaignId) {
    await prisma.emailCampaign.update({
      where: { id: emailLog.campaignId },
      data: { totalBounced: { increment: 1 } },
    });
  }
}

export async function handleComplaint({
  messageId,
  reason,
}: ComplaintParams): Promise<void> {
  const emailLog = await prisma.emailLog.findFirst({
    where: { messageId },
  });

  if (!emailLog) return;

  await prisma.emailLog.update({
    where: { id: emailLog.id },
    data: {
      status: "COMPLAINED",
      error: reason || "Spam complaint",
    },
  });

  await prisma.contact.update({
    where: { id: emailLog.contactId },
    data: { doNotContact: true },
  });

  if (emailLog.domainId) {
    await updateDomainHealth(emailLog.domainId);
  }
}
