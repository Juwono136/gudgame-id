import "server-only";

import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth-redis-storage" });

type AuthRedisStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

/** Redis-backed secondary storage for Better Auth (sessions cache + rate limits). */
export const authRedisSecondaryStorage: AuthRedisStorage = {
  get: async (key: string) => {
    try {
      const client = getRedis();
      if (client.status === "wait") await client.connect();
      return (await client.get(key)) ?? null;
    } catch (error) {
      log.warn("Redis get failed", { key, error });
      return null;
    }
  },
  set: async (key: string, value: string, ttl?: number) => {
    try {
      const client = getRedis();
      if (client.status === "wait") await client.connect();
      if (ttl && ttl > 0) {
        await client.set(key, value, "EX", ttl);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      log.warn("Redis set failed", { key, error });
    }
  },
  delete: async (key: string) => {
    try {
      const client = getRedis();
      if (client.status === "wait") await client.connect();
      await client.del(key);
    } catch (error) {
      log.warn("Redis delete failed", { key, error });
    }
  },
};
