import { Queue } from "bullmq";

function getConnection() {
  return {
    host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
    port: parseInt(process.env.REDIS_URL?.split(":").pop() || "6379"),
  };
}

let _emailQueue: Queue | undefined;
let _campaignQueue: Queue | undefined;
let _warmupQueue: Queue | undefined;

export function getEmailQueue() {
  if (!_emailQueue) _emailQueue = new Queue("email-sending", { connection: getConnection() });
  return _emailQueue;
}

export function getCampaignQueue() {
  if (!_campaignQueue) _campaignQueue = new Queue("campaign-processing", { connection: getConnection() });
  return _campaignQueue;
}

export function getWarmupQueue() {
  if (!_warmupQueue) _warmupQueue = new Queue("domain-warmup", { connection: getConnection() });
  return _warmupQueue;
}
