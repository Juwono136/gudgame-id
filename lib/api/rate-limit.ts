import "server-only";

import { AppError } from "@/lib/errors";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "rate-limit" });

export type RateLimitOptions = {
  /** Unique bucket key, e.g. `register:userId` */
  key: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window length in seconds */
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redisKey = `rl:${options.key}`;
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();

    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pexpire(redisKey, windowMs);
    }

    const ttlMs = await client.pttl(redisKey);
    const resetAt = now + (ttlMs > 0 ? ttlMs : windowMs);
    const remaining = Math.max(0, options.limit - count);

    return {
      allowed: count <= options.limit,
      remaining,
      resetAt,
    };
  } catch (error) {
    log.warn("Rate limit check failed — allowing request", { key: options.key, error });
    return { allowed: true, remaining: options.limit, resetAt: now + windowMs };
  }
}

export async function enforceRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const result = await checkRateLimit(options);
  if (!result.allowed) {
    throw new AppError("Too many requests. Please try again shortly.", {
      code: "RATE_LIMITED",
      statusCode: 429,
      context: { resetAt: result.resetAt, remaining: result.remaining },
    });
  }
  return result;
}
