import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentReclubMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import {
  appendScoreEvent,
  parseReclubMatchMetadata,
  type ReclubScoreEvent,
} from "@/lib/tournaments/reclub/score-events";
import { mapReclubMatchRow } from "@/lib/tournaments/reclub/match-mapper";
import {
  getTournamentDeuceConfig,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";
import {
  applyScoreDelta as engineApplyDelta,
  isMatchComplete,
  type ScoringRules,
} from "@/lib/tournaments/scoring/engine";

function buildScoringRules(tournament: TournamentDetail): ScoringRules {
  return {
    pointsPerMatch: getTournamentPointsPerMatch(tournament),
    deuceConfig: getTournamentDeuceConfig(tournament),
    scoringType: getTournamentScoringType(tournament),
  };
}

export async function updateReclubLiveScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  userName: string | null,
  input: {
    scoreA: number;
    scoreB: number;
    action?: ReclubScoreEvent["action"];
    side?: ReclubScoreEvent["side"];
  },
): Promise<ReclubMatchView> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.id, matchId),
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AppError("Active match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const rules = buildScoringRules(tournament);
  let scoreA = Math.max(0, existing.scoreA ?? 0);
  let scoreB = Math.max(0, existing.scoreB ?? 0);

  if (input.action === "increment" && input.side) {
    const next = engineApplyDelta(scoreA, scoreB, input.side, 1, rules);
    if (!next) {
      throw new AppError("Cannot increase score — match may be complete or at cap", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    scoreA = next.scoreA;
    scoreB = next.scoreB;
  } else if (input.action === "decrement" && input.side) {
    const next = engineApplyDelta(scoreA, scoreB, input.side, -1, rules);
    if (!next) {
      throw new AppError("Score cannot go below zero", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    scoreA = next.scoreA;
    scoreB = next.scoreB;
  } else {
    scoreA = Math.max(0, Math.min(rules.deuceConfig.maxScore, input.scoreA));
    scoreB = Math.max(0, Math.min(rules.deuceConfig.maxScore, input.scoreB));
  }

  const prevMeta = parseReclubMatchMetadata(existing.metadata);
  const event: ReclubScoreEvent = {
    at: new Date().toISOString(),
    userId,
    userName: userName ?? undefined,
    scoreA,
    scoreB,
    action: input.action ?? "set",
    side: input.side,
  };
  const metadata = appendScoreEvent(prevMeta, event);

  const [updated] = await db
    .update(tournamentReclubMatches)
    .set({ scoreA, scoreB, metadata, recordedByUserId: userId })
    .where(eq(tournamentReclubMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update score", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return mapReclubMatchRow(updated);
}

export function getReclubMatchCompletion(
  tournament: TournamentDetail,
  scoreA: number,
  scoreB: number,
) {
  return isMatchComplete(scoreA, scoreB, buildScoringRules(tournament));
}
