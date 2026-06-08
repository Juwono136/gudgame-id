import Redis from "ioredis";
import { getServerEnv } from "@/lib/config/env.server";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "redis" });

const REDIS_GLOBAL_KEY = "__courtPediaRedis" as const;

type RedisGlobal = {
  [REDIS_GLOBAL_KEY]?: Redis;
};

const globalForRedis = globalThis as unknown as RedisGlobal;

function createRedisClient(): Redis {
  const { REDIS_URL } = getServerEnv();

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  client.on("connect", () => log.debug("Redis connected"));
  client.on("error", (err) => log.error("Redis connection error", err));

  return client;
}

export function getRedis(): Redis {
  if (!globalForRedis[REDIS_GLOBAL_KEY]) {
    globalForRedis[REDIS_GLOBAL_KEY] = createRedisClient();
  }
  return globalForRedis[REDIS_GLOBAL_KEY];
}

export async function pingRedis(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const client = getRedis();
    if (client.status === "wait") {
      await client.connect();
    }
    const pong = await client.ping();
    return pong === "PONG" ? { ok: true } : { ok: false, error: `Unexpected: ${pong}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("Redis ping failed", { error: message });
    return { ok: false, error: message };
  }
}

export async function closeRedis(): Promise<void> {
  const client = globalForRedis[REDIS_GLOBAL_KEY];
  if (client) {
    await client.quit();
    delete globalForRedis[REDIS_GLOBAL_KEY];
    log.info("Redis connection closed");
  }
}
