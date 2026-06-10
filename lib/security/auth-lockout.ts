import "server-only";

import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/config/env.server";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth-lockout" });

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

function isLockoutEnabled(): boolean {
  try {
    return getServerEnv().AUTH_LOCKOUT_ENABLED === true;
  } catch {
    return process.env.AUTH_LOCKOUT_ENABLED === "true";
  }
}

function lockKey(ip: string, email: string): string {
  return `auth:lock:${ip}:${email.trim().toLowerCase()}`;
}

function attemptsKey(ip: string, email: string): string {
  return `auth:fail:${ip}:${email.trim().toLowerCase()}`;
}

export async function assertLoginNotLocked(
  ip: string,
  email: string,
): Promise<void> {
  if (!isLockoutEnabled()) return;

  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();

    const locked = await client.get(lockKey(ip, email));
    if (!locked) return;

    const ttl = await client.ttl(lockKey(ip, email));
    throw new AppError(
      `Too many failed sign-in attempts. Try again in ${Math.max(ttl, 60)} seconds.`,
      {
        code: "RATE_LIMITED",
        statusCode: 429,
        context: { retryAfterSeconds: ttl },
      },
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.warn("Login lockout check failed — allowing attempt", { error });
  }
}

export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  if (!isLockoutEnabled()) return;

  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();

    const key = attemptsKey(ip, email);
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, ATTEMPT_WINDOW_SECONDS);
    }

    if (count >= MAX_FAILED_ATTEMPTS) {
      await client.set(lockKey(ip, email), "1", "EX", LOCKOUT_WINDOW_SECONDS);
      await client.del(key);
      log.warn("Account sign-in temporarily locked", { ip, email });
    }
  } catch (error) {
    log.warn("Failed to record login attempt", { error });
  }
}

export async function clearLoginAttempts(ip: string, email: string): Promise<void> {
  if (!isLockoutEnabled()) return;

  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();
    await client.del(attemptsKey(ip, email), lockKey(ip, email));
  } catch (error) {
    log.warn("Failed to clear login attempts", { error });
  }
}
