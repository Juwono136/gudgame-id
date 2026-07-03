import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema";
import { computeOwnedPlayerCareerStats } from "@/lib/account/player-performance/compute-owned-career-stats";
import {
  getPlayerCareerStats,
  type PlayerCareerStats,
  type PlayerCareerStatsSource,
} from "@/lib/wiki/player-career-stats";
import { getPlayerRankOnLeaderboard } from "@/lib/wiki/player-leaderboard";

async function resolveSportSlug(sportId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ slug: sports.slug })
    .from(sports)
    .where(eq(sports.id, sportId))
    .limit(1);
  return row?.slug ?? null;
}

export async function resolvePlayerCareerStats(input: {
  entity: PlayerCareerStatsSource;
  ownerUserId?: string | null;
  sportId?: string | null;
  sportSlug?: string | null;
}): Promise<PlayerCareerStats> {
  const wikiStats = getPlayerCareerStats(input.entity);

  if (!input.ownerUserId || !input.sportId) {
    return wikiStats;
  }

  const career = await computeOwnedPlayerCareerStats({
    entity: input.entity,
    ownerUserId: input.ownerUserId,
    sportId: input.sportId,
  });

  const sportSlug =
    input.sportSlug?.trim() || (await resolveSportSlug(input.sportId));
  const worldRank = sportSlug
    ? await getPlayerRankOnLeaderboard(sportSlug, input.ownerUserId)
    : career.worldRank;

  return {
    ...career,
    worldRank,
  };
}
