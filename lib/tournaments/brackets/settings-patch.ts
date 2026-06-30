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

export async function patchTournamentBracketSettings(
  tournament: TournamentDetail,
  patch: BracketSettingsPatch,
): Promise<void> {
  const settings = { ...tournament.settings };

  if (patch.bracketSeedMode != null) {
    settings.bracketSeedMode = patch.bracketSeedMode;
  }

  if (patch.bracketSeedingFinalized != null) {
    settings.bracketSeedingFinalized = patch.bracketSeedingFinalized;
  }

  await getDb()
    .update(tournaments)
    .set({ settings })
    .where(eq(tournaments.id, tournament.id));

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
}
