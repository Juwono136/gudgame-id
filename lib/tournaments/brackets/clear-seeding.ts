import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { assertBracketPlayNotStarted } from "@/lib/tournaments/brackets/play-guard";

/** Clears all bracket slot assignments so round one can be reshuffled. */
export async function clearBracketSeedingForReshuffle(tournamentId: string): Promise<string[]> {
  await assertBracketPlayNotStarted(tournamentId);

  const db = getDb();
  const matches = await db
    .select({
      id: tournamentBracketMatches.id,
      roundNumber: tournamentBracketMatches.roundNumber,
      matchNumber: tournamentBracketMatches.matchNumber,
    })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId))
    .orderBy(tournamentBracketMatches.roundNumber, tournamentBracketMatches.matchNumber);

  if (!matches.length) {
    throw new AppError("No bracket structure found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await db
    .update(tournamentBracketMatches)
    .set({
      teamAId: null,
      teamAName: null,
      teamBId: null,
      teamBName: null,
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      status: "pending",
      completedAt: null,
      courtId: null,
      timerEndsAt: null,
      scheduledAt: null,
      recordedByUserId: null,
    })
    .where(inArray(tournamentBracketMatches.id, matches.map((m) => m.id)));

  return matches.filter((m) => m.roundNumber === 1).map((m) => m.id);
}
