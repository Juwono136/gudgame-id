import "server-only";

import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournaments } from "@/db/schema";
import type { PlayerTierLevel } from "@/lib/player/tier";
import { parseRankingMode } from "@/lib/tournaments/match-config";
import { normalizeAllowedTierLevels } from "@/lib/tournaments/tier-restrictions";

/** Skill tier or "open" (No Rank) keyed by tournament id. */
export type TournamentSkillLookup = PlayerTierLevel | "open";

/** Tournament skill tier (from `allowedTierLevels`) keyed by tournament id. */
export async function loadSkillTierByTournamentIds(
  tournamentIds: string[],
): Promise<Map<string, TournamentSkillLookup>> {
  const map = new Map<string, TournamentSkillLookup>();
  if (!tournamentIds.length) return map;

  const db = getDb();
  const rows = await db
    .select({ id: tournaments.id, settings: tournaments.settings })
    .from(tournaments)
    .where(inArray(tournaments.id, tournamentIds));

  for (const row of rows) {
    const settings =
      row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : {};
    if (parseRankingMode(settings.rankingMode) === "open") {
      map.set(row.id, "open");
      continue;
    }
    const allowed = normalizeAllowedTierLevels(settings.allowedTierLevels);
    if (allowed?.[0]) map.set(row.id, allowed[0]);
  }

  return map;
}

export async function loadSkillTierForTournament(
  tournamentId: string,
): Promise<TournamentSkillLookup | null> {
  const map = await loadSkillTierByTournamentIds([tournamentId]);
  return map.get(tournamentId) ?? null;
}
