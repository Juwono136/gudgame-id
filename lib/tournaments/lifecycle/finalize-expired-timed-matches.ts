import "server-only";

import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import { tournaments } from "@/db/schema/tournaments";
import { resolveTimedWinner } from "@/lib/tournaments/scoring/engine";
import { parseTournamentSettings } from "@/lib/tournaments/settings";
import { recordMatchScoreRevision } from "@/lib/tournaments/scoring/score-revisions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "timed-match-finalize" });

/**
 * Auto-finalize timed matches whose timer has expired with a clear leader.
 * Tied matches are left for sudden-death handling via live scoring.
 */
export async function finalizeExpiredTimedMatches(now = new Date()): Promise<{
  finalized: number;
  skippedTied: number;
}> {
  const db = getDb();
  let finalized = 0;
  let skippedTied = 0;

  const timedTournamentIds = (
    await db
      .select({ id: tournaments.id, settings: tournaments.settings })
      .from(tournaments)
      .where(inArray(tournaments.status, ["live", "upcoming"]))
  )
    .filter((t) => parseTournamentSettings(t.settings as Record<string, unknown>).scoringType === "timed")
    .map((t) => t.id);

  if (!timedTournamentIds.length) {
    return { finalized: 0, skippedTied: 0 };
  }

  const groupExpired = await db
    .select()
    .from(tournamentGroupMatches)
    .where(
      and(
        inArray(tournamentGroupMatches.tournamentId, timedTournamentIds),
        eq(tournamentGroupMatches.status, "in_progress"),
        isNotNull(tournamentGroupMatches.timerEndsAt),
        lte(tournamentGroupMatches.timerEndsAt, now),
      ),
    );

  for (const match of groupExpired) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const result = resolveTimedWinner(scoreA, scoreB);
    if (!result.complete || !result.winner) {
      skippedTied += 1;
      continue;
    }
    const winnerTeamId =
      result.winner === "a" ? match.teamAId : match.teamBId;
    await db
      .update(tournamentGroupMatches)
      .set({
        status: "completed",
        completedAt: now,
        winnerTeamId: winnerTeamId ?? null,
        timerEndsAt: null,
      })
      .where(eq(tournamentGroupMatches.id, match.id));
    await recordMatchScoreRevision({
      tournamentId: match.tournamentId,
      matchKind: "group",
      matchId: match.id,
      action: "timer_finalize",
      scoreABefore: scoreA,
      scoreBBefore: scoreB,
      scoreAAfter: scoreA,
      scoreBAfter: scoreB,
      reason: "auto_finalize_timer_expired",
    });
    finalized += 1;
  }

  const bracketExpired = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        inArray(tournamentBracketMatches.tournamentId, timedTournamentIds),
        eq(tournamentBracketMatches.status, "in_progress"),
        isNotNull(tournamentBracketMatches.timerEndsAt),
        lte(tournamentBracketMatches.timerEndsAt, now),
      ),
    );

  for (const match of bracketExpired) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const result = resolveTimedWinner(scoreA, scoreB);
    if (!result.complete || !result.winner) {
      skippedTied += 1;
      continue;
    }
    const winnerTeamId =
      result.winner === "a" ? match.teamAId : match.teamBId;
    await db
      .update(tournamentBracketMatches)
      .set({
        status: "completed",
        completedAt: now,
        winnerTeamId: winnerTeamId ?? null,
        timerEndsAt: null,
      })
      .where(eq(tournamentBracketMatches.id, match.id));
    await recordMatchScoreRevision({
      tournamentId: match.tournamentId,
      matchKind: "bracket",
      matchId: match.id,
      action: "timer_finalize",
      scoreABefore: scoreA,
      scoreBBefore: scoreB,
      scoreAAfter: scoreA,
      scoreBAfter: scoreB,
      reason: "auto_finalize_timer_expired",
    });
    finalized += 1;
  }

  const reclubExpired = await db
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        inArray(tournamentReclubMatches.tournamentId, timedTournamentIds),
        eq(tournamentReclubMatches.status, "in_progress"),
        isNotNull(tournamentReclubMatches.timerEndsAt),
        lte(tournamentReclubMatches.timerEndsAt, now),
      ),
    );

  for (const match of reclubExpired) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const result = resolveTimedWinner(scoreA, scoreB);
    if (!result.complete || !result.winner) {
      skippedTied += 1;
      continue;
    }
    await db
      .update(tournamentReclubMatches)
      .set({
        status: "completed",
        endedAt: now,
        timerEndsAt: null,
      })
      .where(eq(tournamentReclubMatches.id, match.id));
    await recordMatchScoreRevision({
      tournamentId: match.tournamentId,
      matchKind: "reclub",
      matchId: match.id,
      action: "timer_finalize",
      scoreABefore: scoreA,
      scoreBBefore: scoreB,
      scoreAAfter: scoreA,
      scoreBAfter: scoreB,
      reason: "auto_finalize_timer_expired",
    });
    finalized += 1;
  }

  log.info("Timed match finalize pass", { finalized, skippedTied });
  return { finalized, skippedTied };
}
