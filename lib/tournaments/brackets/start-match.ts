import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentCourts } from "@/db/schema/tournament-courts";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import { assertSquadsAvailableForBracketCourt } from "@/lib/tournaments/brackets/court-start-guard";
import {
  listBracketMatches,
  type BracketMatchView,
} from "@/lib/tournaments/brackets/service";
import type { TournamentDetail } from "@/lib/tournaments/service";

export async function startBracketMatchOnCourt(
  tournament: TournamentDetail,
  matchId: string,
  courtId: string,
  userId: string,
): Promise<BracketMatchView> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use bracket scoring", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  assertTournamentLiveForScoring(tournament);

  const db = getDb();

  const [court] = await db
    .select()
    .from(tournamentCourts)
    .where(
      and(eq(tournamentCourts.id, courtId), eq(tournamentCourts.tournamentId, tournament.id)),
    )
    .limit(1);

  if (!court) {
    throw new AppError("Court not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const [busyOnCourt] = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournament.id),
        eq(tournamentBracketMatches.courtId, courtId),
        eq(tournamentBracketMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (busyOnCourt) {
    throw new AppError("This court already has a live bracket match", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, matchId),
        eq(tournamentBracketMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (!match) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (match.status !== "pending") {
    throw new AppError("Only pending matches can be started on a court", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Both teams must be set before starting the match", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  await assertSquadsAvailableForBracketCourt(
    tournament.id,
    match.teamAId,
    match.teamBId,
    courtId,
  );

  const startedAt = new Date();

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      courtId,
      status: "in_progress",
      scoreA: 0,
      scoreB: 0,
      callStatus: "on_court",
      scheduledAt: startedAt,
      recordedByUserId: userId,
    })
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not start match", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const matches = await listBracketMatches(tournament.id);
  const hydrated = matches.find((item) => item.id === updated.id);
  if (!hydrated) {
    throw new AppError("Could not reload match", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return hydrated;
}
