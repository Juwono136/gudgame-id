import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import {
  tournamentGroups,
  tournamentGroupTeams,
} from "@/db/schema/tournament-groups";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { assertBracketSeedingResetAllowed } from "@/lib/tournaments/lifecycle-guards";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { parseDoubleStageSettings } from "@/lib/tournaments/scoring/config";
import type { TournamentDetail } from "@/lib/tournaments/service";

/**
 * Reset knockout bracket tree.
 *
 * Double stage: reverts phase to `group` and clears knockout seeds so the next
 * generate must go through qualified-only `advanceDoubleStageToElimination`
 * (never a full-field elimination of every team).
 */
export async function resetTournamentBracket(tournament: TournamentDetail): Promise<void> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use brackets", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  assertBracketSeedingResetAllowed(tournament);

  const db = getDb();
  const existing = await db
    .select({ status: tournamentBracketMatches.status })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id));

  const ds = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  );
  /** Empty tree but phase still knockout — recover from a failed/partial reset. */
  const stuckEmptyKnockout =
    tournament.format === "double_stage" &&
    ds.phase === "knockout" &&
    existing.length === 0;

  if (!existing.length && !stuckEmptyKnockout) {
    throw new AppError("No bracket to reset", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (existing.some((m) => m.status === "in_progress" || m.status === "completed")) {
    throw new AppError("Cannot reset the bracket after matches have been scored", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (existing.length) {
    await db
      .delete(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
  }

  if (tournament.format === "double_stage") {
    await revertDoubleStageKnockout(tournament);
  } else {
    await patchTournamentBracketSettings(tournament, {
      bracketSeedingFinalized: false,
    });
  }

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
}

async function revertDoubleStageKnockout(tournament: TournamentDetail): Promise<void> {
  const db = getDb();

  // Always merge from the latest DB row so we don't clobber concurrent settings writes.
  const [row] = await db
    .select({ settings: tournaments.settings })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  const baseSettings = {
    ...((row?.settings as Record<string, unknown> | null) ??
      (tournament.settings as Record<string, unknown>) ??
      {}),
  };
  const current = parseDoubleStageSettings(baseSettings.doubleStage);

  const doubleStage = {
    ...current,
    phase: "group" as const,
    knockoutReadyAt: current.knockoutReadyAt ?? undefined,
  };
  delete (doubleStage as { knockoutGeneratedAt?: string }).knockoutGeneratedAt;

  const settings: Record<string, unknown> = {
    ...baseSettings,
    doubleStage,
    bracketSeedingFinalized: false,
  };

  await db
    .update(tournaments)
    .set({ settings, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));

  const groups = await db
    .select({ id: tournamentGroups.id })
    .from(tournamentGroups)
    .where(eq(tournamentGroups.tournamentId, tournament.id));

  if (groups.length) {
    await db
      .update(tournamentGroupTeams)
      .set({ globalSeed: null })
      .where(
        inArray(
          tournamentGroupTeams.groupId,
          groups.map((g) => g.id),
        ),
      );
  }
}
