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
import { buildMatchScoreEvent } from "@/lib/tournaments/scoring/build-score-event";
import { mapReclubMatchRow } from "@/lib/tournaments/reclub/match-mapper";
import { recordMatchScoreRevision } from "@/lib/tournaments/scoring/score-revisions";
import {
  assertTimedScoreAllowed,
  buildSuddenDeathEndsAt,
  hasSuddenDeathExtended,
} from "@/lib/tournaments/scoring/timed-hard-stop";
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
    scorerName?: string;
    scorerUserId?: string;
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
  const scoreABefore = scoreA;
  const scoreBBefore = scoreB;
  let nextTimerEndsAt = existing.timerEndsAt ?? null;
  let metaExtra: Record<string, unknown> = {};

  const timedGate = assertTimedScoreAllowed(tournament, {
    timerEndsAt: existing.timerEndsAt,
    scoreA,
    scoreB,
    action: input.action,
    suddenDeathExtended: hasSuddenDeathExtended(existing.metadata),
  });
  if (timedGate.blocked && timedGate.reason === "expired_tied_extend") {
    nextTimerEndsAt = buildSuddenDeathEndsAt(tournament);
    metaExtra = { suddenDeathExtended: true };
  }

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
  const event = buildMatchScoreEvent(userId, userName, scoreA, scoreB, {
    action: input.action ?? "set",
    side: input.side,
    scorerName: input.scorerName,
    scorerUserId: input.scorerUserId,
  });
  const metadata =
    input.action === "decrement"
      ? { ...prevMeta, ...metaExtra }
      : { ...appendScoreEvent(prevMeta, event), ...metaExtra };

  const [updated] = await db
    .update(tournamentReclubMatches)
    .set({
      scoreA,
      scoreB,
      metadata,
      recordedByUserId: userId,
      ...(nextTimerEndsAt && nextTimerEndsAt !== existing.timerEndsAt
        ? { timerEndsAt: nextTimerEndsAt }
        : {}),
    })
    .where(eq(tournamentReclubMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update score", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  await recordMatchScoreRevision({
    tournamentId: tournament.id,
    matchKind: "reclub",
    matchId,
    action: input.action ?? "set",
    scoreABefore,
    scoreBBefore,
    scoreAAfter: scoreA,
    scoreBAfter: scoreB,
    side: input.side,
    actorUserId: userId,
    actorName: userName,
  });

  return mapReclubMatchRow(updated);
}

export function getReclubMatchCompletion(
  tournament: TournamentDetail,
  scoreA: number,
  scoreB: number,
) {
  return isMatchComplete(scoreA, scoreB, buildScoringRules(tournament));
}
