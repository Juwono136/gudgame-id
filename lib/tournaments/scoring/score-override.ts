import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { parseReclubMatchMetadata } from "@/lib/tournaments/reclub/score-events";
import { gameStateAfterFinalGamesOverride } from "@/lib/tournaments/scoring/game-mode";
import { recordMatchScoreRevision } from "@/lib/tournaments/scoring/score-revisions";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type ScoreOverrideKind = "group" | "bracket";

export type ScoreOverrideInput = {
  kind: ScoreOverrideKind;
  matchId: string;
  scoreA: number;
  scoreB: number;
  reason: string;
  winnerSide?: "a" | "b" | null;
};

/**
 * Question of Law override: correct a completed match score from the organizer dashboard.
 * Always writes an audit revision. Does not change field facts (in/out calls).
 *
 * In games mode, also clears `metadata.gameState.completedGames` so live UI
 * reconcile cannot keep showing the pre-override tally (Math.max trap).
 */
export async function overrideCompletedMatchScore(
  tournament: TournamentDetail,
  userId: string,
  userName: string | null,
  input: ScoreOverrideInput,
): Promise<{ id: string; scoreA: number; scoreB: number; status: string }> {
  const reason = input.reason.trim();
  if (reason.length < 5) {
    throw new AppError("Override reason must be at least 5 characters (Question of Law)", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  const scoreA = Math.max(0, Math.floor(input.scoreA));
  const scoreB = Math.max(0, Math.floor(input.scoreB));
  if (scoreA > 99 || scoreB > 99) {
    throw new AppError("Scores must be between 0 and 99", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  if (scoreA === scoreB && !input.winnerSide) {
    throw new AppError("Tied override requires an explicit winner side", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();

  if (input.kind === "group") {
    const [match] = await db
      .select()
      .from(tournamentGroupMatches)
      .where(
        and(
          eq(tournamentGroupMatches.id, input.matchId),
          eq(tournamentGroupMatches.tournamentId, tournament.id),
        ),
      )
      .limit(1);
    if (!match) {
      throw new AppError("Group match not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (match.status !== "completed") {
      throw new AppError("Override is only for completed matches — use live scoring otherwise", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    const winnerSide =
      input.winnerSide ?? (scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null);
    const winnerTeamId =
      winnerSide === "a" ? match.teamAId : winnerSide === "b" ? match.teamBId : null;

    const prevMeta = parseReclubMatchMetadata(match.metadata);
    const metadata = {
      ...prevMeta,
      gameState: gameStateAfterFinalGamesOverride(prevMeta.gameState),
      overrideAt: new Date().toISOString(),
      overrideReason: reason,
    };

    const [updated] = await db
      .update(tournamentGroupMatches)
      .set({
        scoreA,
        scoreB,
        winnerTeamId: winnerTeamId ?? null,
        recordedByUserId: userId,
        metadata,
      })
      .where(eq(tournamentGroupMatches.id, match.id))
      .returning();

    await recordMatchScoreRevision({
      tournamentId: tournament.id,
      matchKind: "group",
      matchId: match.id,
      action: "complete_override",
      scoreABefore: match.scoreA ?? 0,
      scoreBBefore: match.scoreB ?? 0,
      scoreAAfter: scoreA,
      scoreBAfter: scoreB,
      actorUserId: userId,
      actorName: userName,
      reason,
      gameState: metadata.gameState,
    });

    if (tournament.partnerId) {
      const { syncPartnerMatchResult } = await import("@/lib/partners/stats/sync");
      await syncPartnerMatchResult({
        tournament,
        fixtureId: match.id,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        scoreA,
        scoreB,
        round: "Group stage",
      });
    }

    const { refreshGroupQualificationAfterScoreChange } = await import(
      "@/lib/tournaments/double-stage/service"
    );
    await refreshGroupQualificationAfterScoreChange(tournament);

    await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
    return {
      id: updated!.id,
      scoreA,
      scoreB,
      status: updated!.status,
    };
  }

  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, input.matchId),
        eq(tournamentBracketMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);
  if (!match) {
    throw new AppError("Bracket match not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (match.status !== "completed") {
    throw new AppError("Override is only for completed matches — use live scoring otherwise", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const winnerSide =
    input.winnerSide ?? (scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null);
  const winnerTeamId =
    winnerSide === "a" ? match.teamAId : winnerSide === "b" ? match.teamBId : null;

  const prevMeta = parseReclubMatchMetadata(match.metadata);
  const metadata = {
    ...prevMeta,
    gameState: gameStateAfterFinalGamesOverride(prevMeta.gameState),
    overrideAt: new Date().toISOString(),
    overrideReason: reason,
  };

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      scoreA,
      scoreB,
      winnerTeamId: winnerTeamId ?? null,
      recordedByUserId: userId,
      metadata,
    })
    .where(eq(tournamentBracketMatches.id, match.id))
    .returning();

  await recordMatchScoreRevision({
    tournamentId: tournament.id,
    matchKind: "bracket",
    matchId: match.id,
    action: "complete_override",
    scoreABefore: match.scoreA ?? 0,
    scoreBBefore: match.scoreB ?? 0,
    scoreAAfter: scoreA,
    scoreBAfter: scoreB,
    actorUserId: userId,
    actorName: userName,
    reason,
    gameState: metadata.gameState,
  });

  if (tournament.partnerId) {
    const { syncPartnerMatchResult } = await import("@/lib/partners/stats/sync");
    const dbRounds = await db
      .select({ roundNumber: tournamentBracketMatches.roundNumber })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    const maxRound = Math.max(...dbRounds.map((r) => r.roundNumber), 1);
    const { getBracketRoundLabel } = await import(
      "@/lib/tournaments/brackets/round-labels"
    );
    await syncPartnerMatchResult({
      tournament,
      fixtureId: match.id,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      scoreA,
      scoreB,
      round: getBracketRoundLabel(match.roundNumber, maxRound),
    });
  }

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
  return {
    id: updated!.id,
    scoreA,
    scoreB,
    status: updated!.status,
  };
}
