import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerMatches } from "@/db/schema/player-competition";
import { wikiEntities } from "@/db/schema/wiki";
import { computePlayerMatchStats } from "@/lib/account/player-performance/compute";
import { formatPlayerTierLabel } from "@/lib/player/tier";

/** Recompute match-driven stats and persist to the player's wiki profile for a sport. */
export async function syncPlayerWikiPerformance(
  userId: string,
  sportId: string,
): Promise<void> {
  const db = getDb();

  const [entity] = await db
    .select({ id: wikiEntities.id, performance: wikiEntities.performance })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.ownerUserId, userId),
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "player"),
      ),
    )
    .limit(1);

  if (!entity) return;

  const stats = await computePlayerMatchStats(userId, sportId);
  const existing = (entity.performance ?? {}) as Record<string, unknown>;

  if (stats.totalMatches === 0) {
    const performance = {
      ...existing,
      totalPoints: 0,
      winRate: 0,
      matchWins: 0,
      matchLosses: 0,
      matchCount: 0,
      lastMatchAt: null,
      syncedAt: new Date().toISOString(),
    };
    await db
      .update(wikiEntities)
      .set({
        performance,
        updatedAt: new Date(),
      })
      .where(eq(wikiEntities.id, entity.id));
    return;
  }

  const performance = {
    ...existing,
    totalPoints: stats.totalPoints,
    winRate: stats.winRate,
    tier: stats.tierLevel,
    matchWins: stats.wins,
    matchLosses: stats.losses,
    matchCount: stats.totalMatches,
    lastMatchAt: stats.lastMatchAt,
    syncedAt: new Date().toISOString(),
  };

  await db
    .update(wikiEntities)
    .set({
      performance,
      updatedAt: new Date(),
    })
    .where(eq(wikiEntities.id, entity.id));

  await db
    .update(playerMatches)
    .set({ wikiEntityId: entity.id })
    .where(
      and(
        eq(playerMatches.userId, userId),
        eq(playerMatches.sportId, sportId),
      ),
    );
}

export async function syncPlayerWikiPerformanceSafe(
  userId: string,
  sportId: string | null | undefined,
): Promise<void> {
  if (!sportId) return;
  try {
    await syncPlayerWikiPerformance(userId, sportId);
  } catch {
    /* non-blocking rollup */
  }
}

export function formatAggregateTierLabel(
  tierLevel: string | null | undefined,
): string | null {
  return tierLevel ? formatPlayerTierLabel(tierLevel) : null;
}
