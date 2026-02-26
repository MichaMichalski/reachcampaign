import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  identifier: string,
  limit = 100,
  window = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  const pipeline = redis.multi();
  pipeline.get(key);
  pipeline.ttl(key);
  const results = await pipeline.exec();

  const currentCount = results?.[0]?.[1] ? parseInt(results[0][1] as string, 10) : 0;
  const ttl = results?.[1]?.[1] as number;

  if (currentCount >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: ttl > 0 ? now + ttl : now + window,
    };
  }

  const incrPipeline = redis.multi();
  incrPipeline.incr(key);
  if (currentCount === 0 || ttl < 0) {
    incrPipeline.expire(key, window);
  }
  await incrPipeline.exec();

  const remaining = Math.max(0, limit - currentCount - 1);
  const reset = ttl > 0 ? now + ttl : now + window;

  return { success: true, remaining, reset };
}

export async function rateLimitMiddleware(
  req: NextRequest
): Promise<NextResponse | null> {
  const apiKey = req.headers.get("x-api-key");
  const identifier =
    apiKey ?? req.headers.get("x-forwarded-for") ?? "anonymous";

  const result = await rateLimit(identifier);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.reset - Math.floor(Date.now() / 1000)),
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.reset),
        },
      }
    );
  }

  return null;
}
