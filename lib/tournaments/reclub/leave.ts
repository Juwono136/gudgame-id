import "server-only";

import { and, count, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { clearTeamFromBracketSlots } from "@/lib/tournaments/brackets/clear-team";
import { assertReclubSessionJoinable } from "@/lib/tournaments/reclub/session-guard";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";

async function getUserTeamId(tournamentId: string, userId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ teamId: tournamentTeamMembers.teamId })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(
      and(eq(tournamentTeams.tournamentId, tournamentId), eq(tournamentTeamMembers.userId, userId)),
    )
    .limit(1);
  return row?.teamId ?? null;
}

export async function leaveReclubTournament(
  tournament: TournamentDetail,
  userId: string,
): Promise<void> {
  if (!isFunMatchType(tournament.tournamentType)) {
    throw new AppError("Leave is only available for Fun Match sessions", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  assertReclubSessionJoinable(tournament);

  const db = getDb();
  const teamId = await getUserTeamId(tournament.id, userId);
  if (!teamId) {
    throw new AppError("You are not on a squad in this session", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const [activeReclub] = await db
    .select({ id: tournamentReclubMatches.id })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        eq(tournamentReclubMatches.status, "in_progress"),
        or(
          eq(tournamentReclubMatches.teamAId, teamId),
          eq(tournamentReclubMatches.teamBId, teamId),
        ),
      ),
    )
    .limit(1);

  if (activeReclub) {
    throw new AppError("Cannot leave while your squad is in an active round", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [activeBracket] = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournament.id),
        eq(tournamentBracketMatches.status, "in_progress"),
        or(
          eq(tournamentBracketMatches.teamAId, teamId),
          eq(tournamentBracketMatches.teamBId, teamId),
        ),
      ),
    )
    .limit(1);

  if (activeBracket) {
    throw new AppError("Cannot leave while your squad is in an active bracket match", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

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

  await db
    .delete(tournamentTeamMembers)
    .where(
      and(eq(tournamentTeamMembers.teamId, teamId), eq(tournamentTeamMembers.userId, userId)),
    );

  const remaining = await db
    .select({
      userId: tournamentTeamMembers.userId,
      slotIndex: tournamentTeamMembers.slotIndex,
      role: tournamentTeamMembers.role,
    })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, teamId))
    .orderBy(tournamentTeamMembers.slotIndex);

  if (remaining.length === 0) {
    await clearTeamFromBracketSlots(tournament.id, teamId);
    await db
      .delete(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          eq(tournamentRegistrations.teamId, teamId),
        ),
      );
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, teamId));
    return;
  }

  if (team.captainUserId === userId) {
    const nextCaptain = remaining.find((m) => m.userId);
    if (!nextCaptain?.userId) {
      throw new AppError("Cannot transfer captaincy — no remaining Gud Game members", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    await db
      .update(tournamentTeams)
      .set({ captainUserId: nextCaptain.userId })
      .where(eq(tournamentTeams.id, teamId));

    await db
      .update(tournamentTeamMembers)
      .set({ role: "captain" })
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, nextCaptain.userId),
        ),
      );
  }

  const [memberCount] = await db
    .select({ count: count() })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, teamId));

  if (Number(memberCount?.count ?? 0) === 0) {
    await clearTeamFromBracketSlots(tournament.id, teamId);
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, teamId));
  }
}
