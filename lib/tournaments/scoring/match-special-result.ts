import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import {
  computeRetirementScore,
  computeWalkoverScore,
  emptyClassicMatchGameState,
  type MatchResultMethod,
} from "@/lib/tournaments/scoring/classic-sets";
import { recordMatchScoreRevision } from "@/lib/tournaments/scoring/score-revisions";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  getTournamentClassicSetRules,
  getTournamentGameRules,
  getTournamentMatchFormat,
  isClassicSetsFormat,
} from "@/lib/tournaments/settings";
import { parseReclubMatchMetadata } from "@/lib/tournaments/reclub/score-events";

export type RecordSpecialResultInput = {
  kind: "group" | "bracket";
  matchId: string;
  method: Exclude<MatchResultMethod, "normal">;
  /** Side that wins the match (opponent defaulted / retired / withdrew). */
  winnerSide: "a" | "b";
  reason: string;
};

/**
 * ITF Duties & Procedures — Walkover / Retirement / Withdrawal recording.
 * Walkover: winner gets walkoverGames–0 per set needed.
 * Retirement: finish current set from last position, then WO remaining sets.
 */
export async function recordSpecialMatchResult(
  tournament: TournamentDetail,
  userId: string,
  userName: string | null,
  input: RecordSpecialResultInput,
): Promise<{ scoreA: number; scoreB: number; method: string }> {
  const reason = input.reason.trim();
  if (reason.length < 5) {
    throw new AppError("Explain the ruling (min 5 characters)", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const setRules = getTournamentClassicSetRules(tournament);
  const db = getDb();
  const table =
    input.kind === "group" ? tournamentGroupMatches : tournamentBracketMatches;

  const [match] = await db
    .select()
    .from(table)
    .where(and(eq(table.id, input.matchId), eq(table.tournamentId, tournament.id)))
    .limit(1);

  if (!match) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (match.status === "completed" || match.status === "bye") {
    throw new AppError("Match is already closed — use score override instead", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const meta = parseReclubMatchMetadata(
    (match as { metadata?: unknown }).metadata,
  );
  const gs = meta.gameState ?? emptyClassicMatchGameState();

  let scoreA: number;
  let scoreB: number;
  let gamesForA: number;
  let gamesForB: number;
  let setScores;

  if (input.method === "walkover" || input.method === "withdrawal") {
    // Withdrawal before play treated as walkover for score convention.
    if (isClassicSetsFormat(tournament) || getTournamentMatchFormat(tournament) === "classic_sets") {
      const wo = computeWalkoverScore(input.winnerSide, setRules);
      scoreA = wo.setsA;
      scoreB = wo.setsB;
      gamesForA = wo.gamesForA;
      gamesForB = wo.gamesForB;
      setScores = wo.setScores;
    } else {
      const raceStage = input.kind === "group" ? "group" : "knockout";
      const race = getTournamentGameRules(tournament, raceStage).raceToGames;
      scoreA = input.winnerSide === "a" ? race : 0;
      scoreB = input.winnerSide === "b" ? race : 0;
      gamesForA = scoreA;
      gamesForB = scoreB;
      setScores = undefined;
    }
  } else {
    // retirement
    if (isClassicSetsFormat(tournament)) {
      const ret = computeRetirementScore(
        input.winnerSide,
        {
          setsA: match.scoreA ?? 0,
          setsB: match.scoreB ?? 0,
          gamesInSetA: gs.gamesInSetA ?? 0,
          gamesInSetB: gs.gamesInSetB ?? 0,
          setScores: gs.setScores ?? [],
        },
        setRules,
      );
      scoreA = ret.setsA;
      scoreB = ret.setsB;
      gamesForA = ret.gamesForA;
      gamesForB = ret.gamesForB;
      setScores = ret.setScores;
    } else {
      const raceStage = input.kind === "group" ? "group" : "knockout";
      const race = getTournamentGameRules(tournament, raceStage).raceToGames;
      scoreA = input.winnerSide === "a" ? race : Math.min(match.scoreA ?? 0, race - 1);
      scoreB = input.winnerSide === "b" ? race : Math.min(match.scoreB ?? 0, race - 1);
      gamesForA = scoreA;
      gamesForB = scoreB;
      setScores = undefined;
    }
  }

  const winnerTeamId =
    input.winnerSide === "a"
      ? (match as { teamAId?: string | null }).teamAId
      : (match as { teamBId?: string | null }).teamBId;

  await db
    .update(table)
    .set({
      scoreA,
      scoreB,
      status: "completed",
      completedAt: new Date(),
      winnerTeamId: winnerTeamId ?? null,
      metadata: {
        ...meta,
        resultMethod: input.method,
        resultReason: reason,
        gameState: {
          ...emptyClassicMatchGameState(),
          setScores: setScores ?? [],
        },
        setsForA: scoreA,
        setsForB: scoreB,
        gamesForA,
        gamesForB,
      },
      recordedByUserId: userId,
    })
    .where(eq(table.id, input.matchId));

  await recordMatchScoreRevision({
    tournamentId: tournament.id,
    matchKind: input.kind,
    matchId: input.matchId,
    action: "complete",
    scoreABefore: match.scoreA ?? 0,
    scoreBBefore: match.scoreB ?? 0,
    scoreAAfter: scoreA,
    scoreBAfter: scoreB,
    actorUserId: userId,
    actorName: userName,
    reason: `${input.method}: ${reason}`,
  });

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  return { scoreA, scoreB, method: input.method };
}
