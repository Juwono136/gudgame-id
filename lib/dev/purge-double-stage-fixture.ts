import "server-only";

import {
  ALL_SKILL_TIERS,
  deleteSeedPlayersByPrefix,
  doubleStagePlayerPrefix,
  doubleStageSlugForTier,
  purgeTournamentsBySlugs,
} from "@/lib/dev/seed-tournament-fixtures";
import type { PlayerTierLevel } from "@/lib/player/tier";

/** @deprecated Prefer per-tier slugs from `doubleStageSlugForTier` */
export const DOUBLE_STAGE_FIXTURE_SLUG = "dev-double-stage-32";
export const DOUBLE_STAGE_PLAYER_EMAIL_PREFIX = "ds32-p";
export const DOUBLE_STAGE_PLAYER_EMAIL_DOMAIN = "gudgame.local";

export type PurgeDoubleStageResult = {
  removed: boolean;
  tournamentId: string | null;
  paymentsDeleted: number;
  playerMatchesCleared: number;
  playerResultsCleared: number;
  seedPlayersDeleted: number;
  removedSlugs: string[];
};

export async function purgeDoubleStageFixture(input: {
  sportId: string;
  tournamentSlug?: string;
  /** Purge every per-tier double-stage fixture when true / when slug omitted */
  allTiers?: boolean;
  purgeSeedPlayers?: boolean;
}): Promise<boolean> {
  const result = await purgeDoubleStageFixtureDetailed(input);
  return result.removed;
}

export async function purgeDoubleStageFixtureDetailed(input: {
  sportId: string;
  tournamentSlug?: string;
  allTiers?: boolean;
  purgeSeedPlayers?: boolean;
}): Promise<PurgeDoubleStageResult> {
  const slugs =
    input.allTiers || !input.tournamentSlug
      ? [
          ...ALL_SKILL_TIERS.map((tier) => doubleStageSlugForTier(tier)),
          DOUBLE_STAGE_FIXTURE_SLUG,
        ]
      : [input.tournamentSlug];

  const { removed, paymentsDeleted } = await purgeTournamentsBySlugs({
    sportId: input.sportId,
    slugs: [...new Set(slugs)],
  });

  let seedPlayersDeleted = 0;
  if (input.purgeSeedPlayers) {
    seedPlayersDeleted += await deleteSeedPlayersByPrefix(DOUBLE_STAGE_PLAYER_EMAIL_PREFIX);
    for (const tier of ALL_SKILL_TIERS) {
      seedPlayersDeleted += await deleteSeedPlayersByPrefix(doubleStagePlayerPrefix(tier));
    }
  }

  return {
    removed: removed > 0,
    tournamentId: null,
    paymentsDeleted,
    playerMatchesCleared: 0,
    playerResultsCleared: 0,
    seedPlayersDeleted,
    removedSlugs: removed > 0 ? slugs : [],
  };
}

export function listDoubleStageFixtureSlugs(
  tiers: readonly PlayerTierLevel[] = ALL_SKILL_TIERS,
): string[] {
  return tiers.map((tier) => doubleStageSlugForTier(tier));
}
