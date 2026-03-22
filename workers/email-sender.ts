import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../src/lib/email/sender";
import { renderEmailTemplate } from "../src/lib/email/template-renderer";
import { selectDomain } from "../src/lib/email/domain-rotation";
import { getRedisConnection } from "../src/lib/queue";

const prisma = new PrismaClient();

type EmailJobData = {
  campaignId: string;
  contactId: string;
  templateId: string;
};

const connection = getRedisConnection();

async function processEmailJob(job: Job<EmailJobData>) {
  const { campaignId, contactId, templateId } = job.data;

  const [contact, template, emailCampaign] = await Promise.all([
    prisma.contact.findUnique({ where: { id: contactId } }),
    prisma.emailTemplate.findUnique({ where: { id: templateId } }),
    prisma.emailCampaign.findUnique({ where: { id: campaignId } }),
  ]);

  if (!contact || !template) {
    throw new Error(
      `Missing data: contact=${!!contact} template=${!!template}`
    );
  }

  if (contact.doNotContact) {
    console.log(`Skipping do-not-contact: ${contact.email}`);
    return { skipped: true, reason: "doNotContact" };
  }

  const domain = await selectDomain();
  if (!domain) {
    throw new Error("No available sending domain");
  }

  const fromEmail = `noreply@${domain.domain}`;

  const renderCampaignId = emailCampaign?.id ?? campaignId;

  const emailLog = await prisma.emailLog.create({
    data: {
      contactId: contact.id,
      campaignId: emailCampaign?.id ?? null,
      domainId: domain.id,
      toEmail: contact.email,
      fromEmail,
      subject: template.subject,
      status: "SENDING",
    },
  });

  try {
    const html = renderEmailTemplate({
      html: template.htmlContent,
      contact,
      emailLogId: emailLog.id,
      campaignId: renderCampaignId,
    });

    const result = await sendEmail({
      to: contact.email,
      from: fromEmail,
      subject: template.subject,
      html,
      text: template.textContent || undefined,
    });

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        messageId: result.messageId,
        providerId: result.provider,
      },
    });

    await prisma.sendingDomain.update({
      where: { id: domain.id },
      data: { dailySent: { increment: 1 } },
    });

    if (emailCampaign) {
      await prisma.emailCampaign.update({
        where: { id: emailCampaign.id },
        data: { totalSent: { increment: 1 } },
      });
    }

    return { messageId: result.messageId, provider: result.provider };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: "FAILED", error: errorMessage },
    });

    throw err;
  }
}

export const emailSenderWorker = new Worker<EmailJobData>(
  "email-sending",
  processEmailJob,
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  }
);

emailSenderWorker.on("completed", (job) => {
  console.log(`[email-sender] Job ${job.id} completed`);
});

emailSenderWorker.on("failed", (job, err) => {
  console.error(`[email-sender] Job ${job?.id} failed:`, err.message);
});

export default emailSenderWorker;
