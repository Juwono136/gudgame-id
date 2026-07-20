import "server-only";

import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "redis-cache" });

export type CacheOptions = {
  /** Time-to-live in seconds */
  ttlSeconds: number;
  /** Optional prefix for cache key namespace */
  prefix?: string;
};

function buildKey(prefix: string | undefined, key: string): string {
  return prefix ? `cache:${prefix}:${key}` : `cache:${key}`;
}

/** In-process single-flight — collapses stampede misses within one Node instance. */
const inflight = new Map<string, Promise<unknown>>();

export async function getCached<T>(key: string, options?: Pick<CacheOptions, "prefix">): Promise<T | null> {
  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();
    const raw = await client.get(buildKey(options?.prefix, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    log.warn("Cache read failed", { key, error });
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions,
): Promise<void> {
  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();
    await client.setex(
      buildKey(options.prefix, key),
      options.ttlSeconds,
      JSON.stringify(value),
    );
  } catch (error) {
    log.warn("Cache write failed", { key, error });
  }
}

export async function invalidateCached(key: string, prefix?: string): Promise<void> {
  try {
    const client = getRedis();
    if (client.status === "wait") await client.connect();
    await client.del(buildKey(prefix, key));
  } catch (error) {
    log.warn("Cache invalidate failed", { key, error });
  }
}

type CacheEnvelope<T> = { hit: true; value: T };

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions,
): Promise<T> {
  const cached = await getCached<CacheEnvelope<T>>(key, { prefix: options.prefix });
  if (cached?.hit) return cached.value;

  const flightKey = buildKey(options.prefix, key);
  const existing = inflight.get(flightKey);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      // Re-check after winning the flight (another worker may have filled Redis).
      const again = await getCached<CacheEnvelope<T>>(key, { prefix: options.prefix });
      if (again?.hit) return again.value;

      const fresh = await fetcher();
      if (fresh != null) {
        await setCached(key, { hit: true, value: fresh } satisfies CacheEnvelope<T>, options);
      }
      return fresh;
    } finally {
      inflight.delete(flightKey);
    }
  })();

  inflight.set(flightKey, promise);
  return promise;
}
