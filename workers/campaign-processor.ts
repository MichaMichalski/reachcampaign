import { Worker, Job, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const connection = {
  host:
    process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":").pop() || "6379"),
};

type CampaignJobData = {
  campaignId: string;
  nodeId: string;
  contactId: string;
};

const emailQueue = new Queue("email-sending", { connection });
const campaignQueue = new Queue("campaign-processing", { connection });

async function getNextEdges(
  nodeId: string,
  campaignId: string,
  handleFilter?: string
) {
  const edges = await prisma.campaignEdge.findMany({
    where: { campaignId, sourceNodeId: nodeId },
  });

  if (handleFilter) {
    return edges.filter(
      (e) => e.label?.toLowerCase() === handleFilter.toLowerCase()
    );
  }
  return edges;
}

async function evaluateCondition(
  config: Record<string, unknown>,
  contactId: string
): Promise<boolean> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { tags: true },
  });

  if (!contact) return false;

  switch (config.conditionType) {
    case "score_threshold":
      return contact.score >= (Number(config.scoreThreshold) || 0);

    case "has_tag":
      return contact.tags.some((t) => t.tagId === config.tagId);

    case "custom_field": {
      const fields = contact.customFields as Record<string, unknown>;
      return fields[config.fieldName as string] === config.fieldValue;
    }

    case "email_opened": {
      const openedCount = await prisma.emailLog.count({
        where: { contactId, status: "OPENED" },
      });
      return openedCount > 0;
    }

    default:
      return false;
  }
}

async function executeAction(
  config: Record<string, unknown>,
  templateId: string | null,
  campaignId: string,
  contactId: string
) {
  switch (config.actionType) {
    case "send_email": {
      const tplId = (config.templateId as string) || templateId;
      if (tplId) {
        await emailQueue.add(`email-${campaignId}-${contactId}`, {
          campaignId,
          contactId,
          templateId: tplId,
        });
      }
      break;
    }

    case "add_tag": {
      if (config.tagId) {
        await prisma.contactTag.upsert({
          where: {
            contactId_tagId: {
              contactId,
              tagId: config.tagId as string,
            },
          },
          create: { contactId, tagId: config.tagId as string },
          update: {},
        });
      }
      break;
    }

    case "remove_tag": {
      if (config.tagId) {
        await prisma.contactTag.deleteMany({
          where: { contactId, tagId: config.tagId as string },
        });
      }
      break;
    }

    case "update_score": {
      const points = Number(config.points) || 0;
      await prisma.contact.update({
        where: { id: contactId },
        data: { score: { increment: points } },
      });
      break;
    }

    case "webhook": {
      if (config.webhookUrl) {
        const contact = await prisma.contact.findUnique({
          where: { id: contactId },
        });
        await fetch(config.webhookUrl as string, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, contactId, contact }),
        });
      }
      break;
    }

    case "add_to_segment": {
      if (config.segmentId) {
        await prisma.contactSegment.upsert({
          where: {
            contactId_segmentId: {
              contactId,
              segmentId: config.segmentId as string,
            },
          },
          create: { contactId, segmentId: config.segmentId as string },
          update: {},
        });
      }
      break;
    }
  }
}

function getDelayMs(config: Record<string, unknown>): number {
  const duration = Number(config.duration) || 1;
  const unit = String(config.unit || "hours");
  switch (unit) {
    case "minutes":
      return duration * 60 * 1000;
    case "hours":
      return duration * 60 * 60 * 1000;
    case "days":
      return duration * 24 * 60 * 60 * 1000;
    default:
      return duration * 60 * 60 * 1000;
  }
}

async function processCampaignJob(job: Job<CampaignJobData>) {
  const { campaignId, nodeId, contactId } = job.data;

  const [campaign, node, contact] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.campaignNode.findUnique({ where: { id: nodeId } }),
    prisma.contact.findUnique({ where: { id: contactId } }),
  ]);

  if (!campaign || !node || !contact) {
    throw new Error(
      `Missing data: campaign=${!!campaign} node=${!!node} contact=${!!contact}`
    );
  }

  if (campaign.status !== "ACTIVE") {
    await prisma.campaignLog.create({
      data: {
        campaignId,
        nodeId,
        contactId,
        status: "SKIPPED",
        result: { reason: `Campaign status is ${campaign.status}` },
      },
    });
    return { skipped: true, reason: "Campaign not active" };
  }

  const log = await prisma.campaignLog.create({
    data: {
      campaignId,
      nodeId,
      contactId,
      status: "PROCESSING",
    },
  });

  try {
    const config = node.config as Record<string, unknown>;
    let edgeFilter: string | undefined;

    switch (node.type) {
      case "TRIGGER":
        break;

      case "CONDITION": {
        const result = await evaluateCondition(config, contactId);
        edgeFilter = result ? "yes" : "no";
        break;
      }

      case "ACTION":
        await executeAction(config, node.templateId, campaignId, contactId);
        break;

      case "DELAY": {
        const delayMs = getDelayMs(config);
        const delayEdges = await getNextEdges(nodeId, campaignId);
        for (const edge of delayEdges) {
          await campaignQueue.add(
            `campaign-${campaignId}-${edge.targetNodeId}-${contactId}`,
            { campaignId, nodeId: edge.targetNodeId, contactId },
            { delay: delayMs }
          );
        }
        await prisma.campaignLog.update({
          where: { id: log.id },
          data: {
            status: "COMPLETED",
            result: { delayMs, nextNodes: delayEdges.length },
          },
        });
        return { delayed: true, delayMs };
      }
    }

    await prisma.campaignLog.update({
      where: { id: log.id },
      data: { status: "COMPLETED", result: { type: node.type } },
    });

    const nextEdges = await getNextEdges(nodeId, campaignId, edgeFilter);
    for (const edge of nextEdges) {
      await campaignQueue.add(
        `campaign-${campaignId}-${edge.targetNodeId}-${contactId}`,
        { campaignId, nodeId: edge.targetNodeId, contactId }
      );
    }

    return { processed: true, type: node.type };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.campaignLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: errorMessage },
    });
    throw err;
  }
}

export const campaignProcessorWorker = new Worker<CampaignJobData>(
  "campaign-processing",
  processCampaignJob,
  {
    connection,
    concurrency: 10,
  }
);

campaignProcessorWorker.on("completed", (job) => {
  console.log(`[campaign-processor] Job ${job.id} completed`);
});

campaignProcessorWorker.on("failed", (job, err) => {
  console.error(`[campaign-processor] Job ${job?.id} failed:`, err.message);
});

export default campaignProcessorWorker;
