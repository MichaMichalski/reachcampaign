import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function getRedisClient(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;

  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  globalForRedis.redis = client;
  return client;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const client = getRedisClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
