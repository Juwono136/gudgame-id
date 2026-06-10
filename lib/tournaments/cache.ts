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
    await invalidateCached(tournamentDetailCacheKey(sportSlug, slug), PREFIX);
  }
}
