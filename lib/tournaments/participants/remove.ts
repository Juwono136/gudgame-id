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

  await db
    .delete(tournamentTeamMembers)
    .where(
      and(
        eq(tournamentTeamMembers.teamId, membership.teamId),
        eq(tournamentTeamMembers.userId, targetUserId),
      ),
    );

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
