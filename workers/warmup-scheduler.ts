import { Worker, Queue, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { calculateWarmupTarget, advanceWarmupDay } from "../src/lib/email/warmup";
import { resetDailyCounters } from "../src/lib/email/domain-rotation";
import { getRedisConnection } from "../src/lib/queue";

const prisma = new PrismaClient();

const connection = getRedisConnection();

const warmupQueue = new Queue("domain-warmup", { connection });

async function processWarmup(_job: Job) {
  console.log("[warmup-scheduler] Running daily warmup tasks");

  await resetDailyCounters();

  const warmups = await prisma.domainWarmup.findMany({
    where: { enabled: true },
    include: { domain: true },
  });

  for (const warmup of warmups) {
    try {
      await advanceWarmupDay(warmup.id);

      const refreshed = await prisma.domainWarmup.findUnique({
        where: { id: warmup.id },
      });

      if (refreshed) {
        const target = calculateWarmupTarget(refreshed);

        await prisma.sendingDomain.update({
          where: { id: warmup.domainId },
          data: { maxDailyVolume: target },
        });

        console.log(
          `[warmup-scheduler] ${warmup.domain.domain}: day ${refreshed.currentDay}, target ${target}`
        );
      }
    } catch (err) {
      console.error(
        `[warmup-scheduler] Error processing warmup for ${warmup.domain.domain}:`,
        err
      );
    }
  }
}

export const warmupSchedulerWorker = new Worker(
  "domain-warmup",
  processWarmup,
  { connection }
);

export async function initWarmupScheduler() {
  await warmupQueue.upsertJobScheduler(
    "daily-warmup",
    { pattern: "0 6 * * *" },
    { name: "daily-warmup-run" }
  );
  console.log("[warmup-scheduler] Scheduled daily warmup at 6:00 AM");
}

warmupSchedulerWorker.on("completed", (job) => {
  console.log(`[warmup-scheduler] Job ${job.id} completed`);
});

warmupSchedulerWorker.on("failed", (job, err) => {
  console.error(`[warmup-scheduler] Job ${job?.id} failed:`, err.message);
});

export default warmupSchedulerWorker;
