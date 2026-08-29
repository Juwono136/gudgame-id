import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import {
  getTeamCompetitiveActivity,
  teamRemovalBlockedError,
} from "@/lib/tournaments/participants/removal-policy";

/**
 * Swap slot order for a doubles pair (player 1 ↔ player 2) without changing the team.
 * Blocked after the team has competed so match history stays consistent.
 */
export async function swapTeamPairSlotOrder(
  tournamentId: string,
  teamId: string,
): Promise<{ swapped: true }> {
  const db = getDb();

  const [team] = await db
    .select({ id: tournamentTeams.id })
    .from(tournamentTeams)
    .where(and(eq(tournamentTeams.id, teamId), eq(tournamentTeams.tournamentId, tournamentId)))
    .limit(1);

  if (!team) {
    throw new AppError("Team not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const members = await db
    .select({
      id: tournamentTeamMembers.id,
      userId: tournamentTeamMembers.userId,
      slotIndex: tournamentTeamMembers.slotIndex,
      role: tournamentTeamMembers.role,
    })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, teamId))
    .orderBy(asc(tournamentTeamMembers.slotIndex));

  if (members.length !== 2) {
    throw new AppError("Pair swap is only available for teams with exactly two players.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const memberUserIds = members.map((m) => m.userId).filter((id): id is string => Boolean(id));
  const activity = await getTeamCompetitiveActivity(tournamentId, teamId, memberUserIds);
  if (activity.hasCompeted) {
    throw teamRemovalBlockedError(activity);
  }

  const [a, b] = members;
  if (!a || !b) {
    throw new AppError("Could not load team members", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tournamentTeamMembers)
      .set({ slotIndex: 99 })
      .where(eq(tournamentTeamMembers.id, a.id));
    await tx
      .update(tournamentTeamMembers)
      .set({ slotIndex: a.slotIndex, role: b.role })
      .where(eq(tournamentTeamMembers.id, b.id));
    await tx
      .update(tournamentTeamMembers)
      .set({ slotIndex: b.slotIndex, role: a.role })
      .where(eq(tournamentTeamMembers.id, a.id));
  });

  return { swapped: true };
}
