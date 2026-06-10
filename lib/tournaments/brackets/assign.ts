import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

export async function assignTeamToBracketSlot(
  tournament: TournamentDetail,
  matchId: number,
  slot: "a" | "b",
  teamId: number | null,
): Promise<BracketMatchView> {
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

  if (match.roundNumber !== 1) {
    throw new AppError("Seeding is only allowed in the first round", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (match.status !== "pending") {
    throw new AppError("This match has already started or finished", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [anyStarted] = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournament.id),
        inArray(tournamentBracketMatches.status, ["in_progress", "completed"]),
      ),
    )
    .limit(1);

  if (anyStarted) {
    throw new AppError("Bracket seeding is locked once play has started", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (teamId != null) {
    const [team] = await db
      .select()
      .from(tournamentTeams)
      .where(
        and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, tournament.id)),
      )
      .limit(1);

    if (!team) {
      throw new AppError("Squad not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const [member] = await db
      .select({ userId: tournamentTeamMembers.userId })
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, teamId))
      .limit(1);

    if (!member) {
      throw new AppError("Squad must have at least one player", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const [duplicate] = await db
      .select({ id: tournamentBracketMatches.id })
      .from(tournamentBracketMatches)
      .where(
        and(
          eq(tournamentBracketMatches.tournamentId, tournament.id),
          eq(tournamentBracketMatches.roundNumber, 1),
          or(
            eq(tournamentBracketMatches.teamAId, teamId),
            eq(tournamentBracketMatches.teamBId, teamId),
          ),
        ),
      )
      .limit(1);

    if (duplicate && duplicate.id !== matchId) {
      throw new AppError("This squad is already placed in the bracket", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
  }

  let teamName: string | null = null;
  if (teamId != null) {
    const [teamRow] = await db
      .select({ name: tournamentTeams.name })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.id, teamId))
      .limit(1);
    teamName = teamRow?.name ?? null;
  }

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set(
      teamId == null
        ? slot === "a"
          ? { teamAId: null, teamAName: null }
          : { teamBId: null, teamBName: null }
        : slot === "a"
          ? { teamAId: teamId, teamAName: teamName }
          : { teamBId: teamId, teamBName: teamName },
    )
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update bracket slot", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return {
    id: updated.id,
    roundNumber: updated.roundNumber,
    matchNumber: updated.matchNumber,
    teamAId: updated.teamAId,
    teamBId: updated.teamBId,
    teamAName: updated.teamAName,
    teamBName: updated.teamBName,
    scoreA: updated.scoreA,
    scoreB: updated.scoreB,
    winnerTeamId: updated.winnerTeamId,
    status: updated.status,
    nextMatchId: updated.nextMatchId,
  };
}
