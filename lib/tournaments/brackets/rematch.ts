import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import { isFunMatchType, isOfficialType } from "@/lib/tournaments/core/types";
import {
  listBracketMatches,
  type BracketMatchView,
} from "@/lib/tournaments/brackets/service";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import type { TournamentDetail } from "@/lib/tournaments/service";

async function rollbackWinnerFromSubtree(
  tournamentId: string,
  startMatchId: string,
  winnerTeamId: string,
): Promise<void> {
  const db = getDb();
  const allRows = await db
    .select()
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId));

  const byId = new Map(allRows.map((r) => [r.id, r]));
  const toClear = new Set<string>();

  function walk(matchId: string) {
    const row = byId.get(matchId);
    if (!row) return;
    if (row.teamAId === winnerTeamId) {
      toClear.add(matchId);
      if (row.nextMatchId) walk(row.nextMatchId);
    } else if (row.teamBId === winnerTeamId) {
      toClear.add(matchId);
      if (row.nextMatchId) walk(row.nextMatchId);
    } else if (row.winnerTeamId === winnerTeamId) {
      toClear.add(matchId);
      if (row.nextMatchId) walk(row.nextMatchId);
    }
  }

  const start = byId.get(startMatchId);
  if (start?.nextMatchId) {
    walk(start.nextMatchId);
  }

  for (const id of toClear) {
    const row = byId.get(id);
    if (!row) continue;
    const clearA = row.teamAId === winnerTeamId;
    const clearB = row.teamBId === winnerTeamId;
    if (!clearA && !clearB && row.winnerTeamId !== winnerTeamId) continue;

    await db
      .update(tournamentBracketMatches)
      .set({
        ...(clearA ? { teamAId: null, teamAName: null } : {}),
        ...(clearB ? { teamBId: null, teamBName: null } : {}),
        ...(row.winnerTeamId === winnerTeamId
          ? {
              winnerTeamId: null,
              scoreA: null,
              scoreB: null,
              status: "pending",
              completedAt: null,
              courtId: null,
            }
          : {}),
      })
      .where(eq(tournamentBracketMatches.id, id));
  }
}

export async function rematchBracketMatch(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
): Promise<BracketMatchView> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use bracket rematch", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  assertTournamentLiveForScoring(tournament);

  const db = getDb();
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

  if (match.status === "bye") {
    throw new AppError("BYE matches cannot be rematched", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const isTiedInProgress =
    match.status === "in_progress" &&
    match.scoreA != null &&
    match.scoreB != null &&
    match.scoreA === match.scoreB;

  if (match.status === "in_progress" && !isTiedInProgress) {
    throw new AppError("Only tied in-progress matches can be replayed — finish or reset scores first", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (match.status !== "completed" && !isTiedInProgress) {
    throw new AppError("Only completed matches can be rematched", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Both teams must be set for rematch", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const winnerTeamId = match.winnerTeamId;

  if (match.status === "completed" && !winnerTeamId) {
    throw new AppError("Match has no recorded winner", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (match.status === "completed" && isFunMatchType(tournament.tournamentType)) {
    const { recordBracketMatchInSessionHistory } = await import(
      "@/lib/tournaments/reclub/session-history"
    );
    await recordBracketMatchInSessionHistory(tournament, match, userId, {
      playType: "bracket_rematch",
    });
  }

  if (match.status === "completed" && winnerTeamId) {
    await rollbackWinnerFromSubtree(tournament.id, match.id, winnerTeamId);

    const { getTeamMemberUserIds } = await import("@/lib/tournaments/brackets/leaderboard");
    const teamAIds = match.teamAId ? await getTeamMemberUserIds(match.teamAId) : [];
    const teamBIds = match.teamBId ? await getTeamMemberUserIds(match.teamBId) : [];
    const participantUserIds = [...new Set([...teamAIds, ...teamBIds])];
    if (participantUserIds.length > 0 && !tournament.partnerId) {
      const { removePlayerMatchHistoryForFixture } = await import(
        "@/lib/tournaments/stats/sync"
      );
      await removePlayerMatchHistoryForFixture({
        tournamentId: tournament.id,
        fixtureId: match.id,
        participantUserIds,
        sportId: tournament.sportId,
      });
    }

    const isFinal = !match.nextMatchId;
    if (isFinal && isOfficialType(tournament.tournamentType)) {
      const memberIds = await getTeamMemberUserIds(winnerTeamId);
      const { removeOfficialPlacement } = await import("@/lib/tournaments/stats/sync");
      for (const uid of memberIds) {
        await removeOfficialPlacement(tournament.id, uid);
      }
    }
  }

  await db
    .update(tournamentBracketMatches)
    .set({
      status: "pending",
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      courtId: null,
      completedAt: null,
      scheduledAt: null,
      recordedByUserId: userId,
    })
    .where(eq(tournamentBracketMatches.id, matchId));

  const matches = await listBracketMatches(tournament.id);
  const hydrated = matches.find((m) => m.id === matchId);
  if (!hydrated) {
    throw new AppError("Could not reload match", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  return hydrated;
}
