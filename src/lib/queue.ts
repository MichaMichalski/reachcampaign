import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":").pop() || "6379"),
};

export const emailQueue = new Queue("email-sending", { connection });
export const campaignQueue = new Queue("campaign-processing", { connection });
export const warmupQueue = new Queue("domain-warmup", { connection });
