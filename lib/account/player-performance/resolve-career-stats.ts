import "server-only";

import {
  computePlayerMatchStats,
  computeSportRank,
} from "@/lib/account/player-performance/compute";
import {
  getPlayerCareerStats,
  type PlayerCareerStats,
  type PlayerCareerStatsSource,
} from "@/lib/wiki/player-career-stats";
import { syncPlayerWikiPerformanceSafe } from "@/lib/account/player-performance/sync-wiki";
import { formatPlayerTierLabel } from "@/lib/player/tier";

function computeYearsActiveFromIso(firstMatchAt: string | null): string | null {
  if (!firstMatchAt) return null;
  const start = new Date(firstMatchAt);
  if (Number.isNaN(start.getTime())) return null;
  const startYear = start.getFullYear();
  const nowYear = new Date().getFullYear();
  return startYear === nowYear ? `${startYear}` : `${startYear}–Present`;
}

export async function resolvePlayerCareerStats(input: {
  entity: PlayerCareerStatsSource;
  ownerUserId?: string | null;
  sportId?: string | null;
}): Promise<PlayerCareerStats> {
  const wikiStats = getPlayerCareerStats(input.entity);

  if (!input.ownerUserId) {
    return wikiStats;
  }

  const computed = await computePlayerMatchStats(
    input.ownerUserId,
    input.sportId ?? undefined,
  );

  if (computed.totalMatches === 0) {
    return wikiStats;
  }

  if (
    input.ownerUserId &&
    input.sportId &&
    (wikiStats.totalPoints ?? 0) !== computed.totalPoints
  ) {
    void syncPlayerWikiPerformanceSafe(input.ownerUserId, input.sportId);
  }

  const worldRank =
    input.sportId != null
      ? await computeSportRank(input.sportId, input.ownerUserId, computed.totalPoints)
      : wikiStats.worldRank;

  const yearsActive =
    wikiStats.yearsActive ?? computeYearsActiveFromIso(computed.firstMatchAt);

  return {
    worldRank,
    totalPoints: computed.totalPoints,
    winRate: computed.winRate,
    tier: computed.tierLevel ? formatPlayerTierLabel(computed.tierLevel) : wikiStats.tier,
    tierLevel: computed.tierLevel ?? wikiStats.tierLevel,
    yearsActive,
  };
}
