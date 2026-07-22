import "server-only";

import { computePlayerMatchStats } from "@/lib/account/player-performance/compute";
import { syncPlayerWikiPerformanceSafe } from "@/lib/account/player-performance/sync-wiki";
import { formatPlayerTierLabel, normalizePlayerTier, resolveCareerTierLevel } from "@/lib/player/tier";
import {
  getPlayerCareerStats,
  type PlayerCareerStats,
  type PlayerCareerStatsSource,
} from "@/lib/wiki/player-career-stats";

function computeYearsActiveFromIso(firstMatchAt: string | null): string | null {
  if (!firstMatchAt) return null;
  const start = new Date(firstMatchAt);
  if (Number.isNaN(start.getTime())) return null;
  const startYear = start.getFullYear();
  const nowYear = new Date().getFullYear();
  return startYear === nowYear ? `${startYear}` : `${startYear}–Present`;
}

/** Match-driven career stats without leaderboard rank (used by leaderboard builder). */
export async function computeOwnedPlayerCareerStats(input: {
  entity: PlayerCareerStatsSource;
  ownerUserId: string;
  sportId: string;
}): Promise<PlayerCareerStats> {
  const wikiStats = getPlayerCareerStats(input.entity);
  const computed = await computePlayerMatchStats(input.ownerUserId, input.sportId);

  const totalPoints =
    computed.totalMatches > 0 ? computed.totalPoints : (wikiStats.totalPoints ?? 0);
  const tierLevel = resolveCareerTierLevel({
    totalPoints,
    storedTier: wikiStats.tierLevel,
  });
  const tier = tierLevel ? formatPlayerTierLabel(tierLevel) : wikiStats.tier;

  if (computed.totalMatches === 0) {
    return {
      ...wikiStats,
      totalPoints: wikiStats.totalPoints ?? 0,
      tierLevel,
      tier,
    };
  }

  const storedPerfTier = normalizePlayerTier(
    typeof input.entity.performance?.tier === "string" ? input.entity.performance.tier : null,
  );
  const pointsMismatch = (wikiStats.totalPoints ?? 0) !== computed.totalPoints;
  const tierMismatch = storedPerfTier !== tierLevel;

  if (pointsMismatch || tierMismatch) {
    void syncPlayerWikiPerformanceSafe(input.ownerUserId, input.sportId);
  }

  const yearsActive =
    wikiStats.yearsActive ?? computeYearsActiveFromIso(computed.firstMatchAt);

  return {
    worldRank: wikiStats.worldRank,
    totalPoints: computed.totalPoints,
    winRate: computed.winRate,
    tier,
    tierLevel,
    yearsActive,
  };
}
