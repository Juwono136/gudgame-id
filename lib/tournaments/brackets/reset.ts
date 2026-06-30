import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { assertBracketSeedingResetAllowed } from "@/lib/tournaments/lifecycle-guards";
import { patchTournamentBracketSettings } from "@/lib/tournaments/brackets/settings-patch";
import type { TournamentDetail } from "@/lib/tournaments/service";

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

  if (!existing.length) {
    throw new AppError("No bracket to reset", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (
    existing.some((m) => m.status === "in_progress" || m.status === "completed")
  ) {
    throw new AppError("Cannot reset the bracket after matches have been scored", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  await db
    .delete(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id));

  await patchTournamentBracketSettings(tournament, {
    bracketSeedingFinalized: false,
  });
}
