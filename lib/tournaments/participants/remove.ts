import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { canManageTournament } from "@/lib/tournaments/permissions";
import {
  assertTeamCanBeHardRemoved,
  cleanupUnplayedCompetitionRecords,
  getTeamCompetitiveActivity,
  teamRemovalBlockedError,
} from "@/lib/tournaments/participants/removal-policy";
import type { TournamentDetail } from "@/lib/tournaments/service";

export async function removeTournamentParticipant(
  tournament: TournamentDetail,
  actorUserId: string,
  roles: import("@/lib/roles/constants").AppRole[],
  targetUserId: string,
): Promise<void> {
  if (!canManageTournament(roles, tournament.createdBy, actorUserId)) {
    throw new AppError("Only the tournament host can remove participants", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (targetUserId === tournament.createdBy) {
    throw new AppError("Cannot remove the tournament host", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();
  const [membership] = await db
    .select({
      teamId: tournamentTeamMembers.teamId,
      role: tournamentTeamMembers.role,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournament.id),
        eq(tournamentTeamMembers.userId, targetUserId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new AppError("Player is not in this tournament", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const teammates = await db
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, membership.teamId));

  const activity = await getTeamCompetitiveActivity(
    tournament.id,
    membership.teamId,
    teammates.map((t) => t.userId),
  );

  // If the squad already competed, removing a member would orphan match/career data.
  if (activity.hasCompeted) {
    throw teamRemovalBlockedError(activity);
  }

  await db
    .delete(tournamentTeamMembers)
    .where(
      and(
        eq(tournamentTeamMembers.teamId, membership.teamId),
        eq(tournamentTeamMembers.userId, targetUserId),
      ),
    );

  await cleanupUnplayedCompetitionRecords({
    tournamentId: tournament.id,
    sportId: tournament.sportId,
    userIds: [targetUserId],
  });

  if (isOfficialType(tournament.tournamentType)) {
    const remainingAfter = await db
      .select({ userId: tournamentTeamMembers.userId })
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, membership.teamId));

    if (remainingAfter.length === 0) {
      await db
        .update(tournamentRegistrations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, tournament.id),
            eq(tournamentRegistrations.teamId, membership.teamId),
          ),
        );
    }
  }

  const remaining = await db
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, membership.teamId));

  if (remaining.length === 0) {
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, membership.teamId));
  }
}

/**
 * Remove an entire team (all members + cancel registration).
 * Allowed only when the team has not competed — protects career stats and match history.
 */
export async function removeTournamentTeam(
  tournament: TournamentDetail,
  actorUserId: string,
  roles: import("@/lib/roles/constants").AppRole[],
  teamId: string,
): Promise<{ teamName: string; removedPlayers: number }> {
  if (!canManageTournament(roles, tournament.createdBy, actorUserId)) {
    throw new AppError("Only the tournament host can remove teams", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const db = getDb();
  const [team] = await db
    .select({
      id: tournamentTeams.id,
      name: tournamentTeams.name,
    })
    .from(tournamentTeams)
    .where(
      and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, tournament.id)),
    )
    .limit(1);

  if (!team) {
    throw new AppError("Team not found in this tournament", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const members = await db
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, team.id));

  if (members.some((m) => m.userId === tournament.createdBy)) {
    throw new AppError("Cannot remove a team that includes the tournament host", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const memberUserIds = members.map((m) => m.userId);
  await assertTeamCanBeHardRemoved(tournament.id, team.id, memberUserIds);

  await db.delete(tournamentTeamMembers).where(eq(tournamentTeamMembers.teamId, team.id));

  if (isOfficialType(tournament.tournamentType)) {
    await db
      .update(tournamentRegistrations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          eq(tournamentRegistrations.teamId, team.id),
        ),
      );
  }

  await db.delete(tournamentTeams).where(eq(tournamentTeams.id, team.id));

  await cleanupUnplayedCompetitionRecords({
    tournamentId: tournament.id,
    sportId: tournament.sportId,
    userIds: memberUserIds,
  });

  return {
    teamName: team.name,
    removedPlayers: members.length,
  };
}
