import "server-only";

import { invalidateCached } from "@/lib/cache/redis-cache";

const PREFIX = "tournaments";

export function tournamentDetailCacheKey(sportSlug: string, slug: string): string {
  return `detail:${sportSlug}:${slug}`;
}

export function tournamentListCacheKey(
  sportSlug: string,
  bucket: "upcoming" | "live" | "past",
  limit: number,
): string {
  return `list:${sportSlug}:${bucket}:${limit}`;
}

export function tournamentLiveCacheKey(sportSlug: string, slug: string): string {
  return `live:${sportSlug}:${slug}`;
}

/** Short TTL — scoreboards poll often; invalidation keeps updates snappy. */
export const TOURNAMENT_LIVE_CACHE_TTL_SECONDS = 2;

export async function invalidateTournamentCaches(
  sportSlug: string,
  slug?: string,
): Promise<void> {
  const buckets = ["upcoming", "live", "past"] as const;
  await Promise.all(
    buckets.map((bucket) =>
      invalidateCached(tournamentListCacheKey(sportSlug, bucket, 12), PREFIX),
    ),
  );
  if (slug) {
    await Promise.all([
      invalidateCached(tournamentDetailCacheKey(sportSlug, slug), PREFIX),
      invalidateCached(tournamentLiveCacheKey(sportSlug, slug), PREFIX),
    ]);
  }
}

export { PREFIX as TOURNAMENT_CACHE_PREFIX };
