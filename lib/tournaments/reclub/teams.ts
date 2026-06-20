import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentReclubMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { syncReclubParticipation } from "@/lib/tournaments/stats/sync";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type LobbyMemberView = {
  userId: string;
  displayName: string;
  image: string | null;
  slotIndex: number;
  role: string;
};

export type LobbyTeamView = {
  id: string; name: string;
  captainUserId: string | null;
  memberCount: number;
  members: LobbyMemberView[];
};

export async function listLobbyTeamsDetailed(tournamentId: string): Promise<LobbyTeamView[]> {
  const db = getDb();
  const teams = await db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .orderBy(tournamentTeams.sortOrder);

  if (!teams.length) return [];

  const teamIds = teams.map((t) => t.id);
  const memberRows = await db
    .select({
      teamId: tournamentTeamMembers.teamId,
      userId: tournamentTeamMembers.userId,
      slotIndex: tournamentTeamMembers.slotIndex,
      role: tournamentTeamMembers.role,
      displayName: user.name,
      image: user.image,
    })
    .from(tournamentTeamMembers)
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(inArray(tournamentTeamMembers.teamId, teamIds));

  return teams.map((team) => {
    const teamMembers = memberRows.filter((m) => m.teamId === team.id);
    return {
      id: team.id,
      name: team.name,
      captainUserId: team.captainUserId,
      memberCount: teamMembers.length,
      members: teamMembers.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        image: m.image,
        slotIndex: m.slotIndex,
        role: m.role,
      })),
    };
  });
}

export async function createNamedTeam(
  tournament: TournamentDetail,
  userId: string,
  teamName: string,
): Promise<{ teamId: string }> {
  const db = getDb();
  if (tournament.maxTeams) {
    const [row] = await db
      .select({ count: count() })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, tournament.id));
    if (Number(row?.count ?? 0) >= tournament.maxTeams) {
      throw new AppError("Maximum teams reached", { code: "CONFLICT", statusCode: 409 });
    }
  }

  const existingTeamId = await getUserTeamId(tournament.id, userId);

  let team;
  try {
    [team] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId: tournament.id,
        name: teamName.trim(),
        captainUserId: userId,
      })
      .returning();
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "";
    if (msg.includes("tournament_teams_name_uidx") || msg.includes("unique")) {
      throw new AppError("A squad with this name already exists", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    throw cause;
  }

  if (!team) {
    throw new AppError("Could not create team", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  if (!existingTeamId) {
    await db.insert(tournamentTeamMembers).values({
      teamId: team.id,
      userId,
      slotIndex: 0,
      role: "captain",
    });

    await db.insert(tournamentRegistrations).values({
      tournamentId: tournament.id,
      teamId: team.id,
      registeredByUserId: userId,
      status: "confirmed",
    });

    await syncReclubParticipation({
      tournament,
      userId,
      role: tournament.createdBy === userId ? "organizer" : "participant",
    });
  }

  return { teamId: team.id };
}

export async function renameReclubTeam(
  tournament: TournamentDetail,
  userId: string,
  teamId: string,
  newName: string,
): Promise<void> {
  if (tournament.tournamentType !== "recreational") {
    throw new AppError("Team rename is only for reclub tournaments", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  if (tournament.status === "completed" || tournament.status === "cancelled") {
    throw new AppError("Cannot rename teams after the session has ended", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const db = getDb();
  const [active] = await db
    .select({ id: tournamentReclubMatches.id })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (active) {
    throw new AppError("Cannot rename teams during an active round", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
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
    throw new AppError("Team not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const canManage = tournament.createdBy === userId;
  const isCaptain = team.captainUserId === userId;
  if (!canManage && !isCaptain) {
    throw new AppError("Only the squad captain or host can rename this team", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const trimmed = newName.trim();
  if (trimmed.length < 2) {
    throw new AppError("Team name must be at least 2 characters", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  try {
    await db
      .update(tournamentTeams)
      .set({ name: trimmed })
      .where(eq(tournamentTeams.id, teamId));
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "";
    if (msg.includes("tournament_teams_name_uidx") || msg.includes("unique")) {
      throw new AppError("A squad with this name already exists", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    throw cause;
  }
}

export async function switchTeam(
  tournament: TournamentDetail,
  userId: string,
  targetTeamId: string,
): Promise<void> {
  const db = getDb();

  const [active] = await db
    .select({ id: tournamentReclubMatches.id })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (active) {
    throw new AppError("Cannot switch squads during an active round", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [target] = await db
    .select()
    .from(tournamentTeams)
    .where(
      and(eq(tournamentTeams.id, targetTeamId), eq(tournamentTeams.tournamentId, tournament.id)),
    )
    .limit(1);

  if (!target) {
    throw new AppError("Team not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const [memberCount] = await db
    .select({ count: count() })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, targetTeamId));

  if (Number(memberCount?.count ?? 0) >= tournament.playersPerTeam) {
    throw new AppError("Team is full", { code: "CONFLICT", statusCode: 409 });
  }

  const currentTeamId = await getUserTeamId(tournament.id, userId);
  if (currentTeamId === targetTeamId) return;

  if (currentTeamId) {
    await db
      .delete(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, currentTeamId),
          eq(tournamentTeamMembers.userId, userId),
        ),
      );
  }

  const nextSlot = Number(memberCount?.count ?? 0);
  await db.insert(tournamentTeamMembers).values({
    teamId: targetTeamId,
    userId,
    slotIndex: nextSlot,
    role: nextSlot === 0 ? "captain" : "member",
  });
}

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

export async function getUserTeamInTournament(
  tournamentId: string,
  userId: string,
): Promise<string | null> {
  return getUserTeamId(tournamentId, userId);
}
