import { Queue } from "bullmq";

export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const url = new URL(redisUrl);
  return {
    host: url.hostname || "localhost",
    port: parseInt(url.port || "6379"),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username && url.username !== "default"
      ? { username: decodeURIComponent(url.username) }
      : {}),
  };
}

let _emailQueue: Queue | undefined;
let _campaignQueue: Queue | undefined;
let _warmupQueue: Queue | undefined;

export function getEmailQueue() {
  if (!_emailQueue) _emailQueue = new Queue("email-sending", { connection: getRedisConnection() });
  return _emailQueue;
}

export function getCampaignQueue() {
  if (!_campaignQueue) _campaignQueue = new Queue("campaign-processing", { connection: getRedisConnection() });
  return _campaignQueue;
}

export function getWarmupQueue() {
  if (!_warmupQueue) _warmupQueue = new Queue("domain-warmup", { connection: getRedisConnection() });
  return _warmupQueue;
}
