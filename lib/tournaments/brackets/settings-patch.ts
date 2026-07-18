import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournaments } from "@/db/schema/tournaments";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type BracketSettingsPatch = {
  bracketSeedMode?: "random" | "manual";
  bracketSeedingFinalized?: boolean;
};

/**
 * Patch bracket seeding flags without clobbering other settings keys
 * (e.g. doubleStage.phase written by a prior update in the same request).
 */
export async function patchTournamentBracketSettings(
  tournament: TournamentDetail,
  patch: BracketSettingsPatch,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ settings: tournaments.settings })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  const settings = {
    ...((row?.settings as Record<string, unknown> | null) ??
      (tournament.settings as Record<string, unknown>) ??
      {}),
  };

  if (patch.bracketSeedMode != null) {
    settings.bracketSeedMode = patch.bracketSeedMode;
  }

  if (patch.bracketSeedingFinalized != null) {
    settings.bracketSeedingFinalized = patch.bracketSeedingFinalized;
  }

  await db
    .update(tournaments)
    .set({ settings, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
}
