import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";

/**
 * A team slot resolved to whichever identity actually fills it — a Gud Game
 * user or a partner guest player. `tournament_team_members.userId` XOR
 * `partnerPlayerId` is enforced at the DB level (see schema check constraint),
 * so exactly one of the two joins below will match per row.
 */
export type ResolvedTeamMember = {
  /** userId for Gud Game members, partnerPlayerId for partner guest members. */
  playerId: string;
  displayName: string;
  kind: "user" | "partner";
  teamId: string;
  slotIndex: number;
  role: string;
};

type ResolvedMemberRow = {
  teamId: string;
  slotIndex: number;
  role: string;
  userId: string | null;
  partnerPlayerId: string | null;
  userName: string | null;
  partnerFullName: string | null;
};

function toResolvedMember(row: ResolvedMemberRow): ResolvedTeamMember | null {
  const playerId = row.userId ?? row.partnerPlayerId;
  if (!playerId) return null;

  return row.userId
    ? {
        playerId,
        displayName: row.userName ?? "Player",
        kind: "user",
        teamId: row.teamId,
        slotIndex: row.slotIndex,
        role: row.role,
      }
    : {
        playerId,
        displayName: row.partnerFullName ?? "Guest",
        kind: "partner",
        teamId: row.teamId,
        slotIndex: row.slotIndex,
        role: row.role,
      };
}

function memberSelection() {
  return {
    teamId: tournamentTeamMembers.teamId,
    slotIndex: tournamentTeamMembers.slotIndex,
    role: tournamentTeamMembers.role,
    userId: tournamentTeamMembers.userId,
    partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
    userName: user.name,
    partnerFullName: partnerPlayers.fullName,
  };
}

/** All team members (Gud Game users + partner guests) for a tournament. */
export async function resolveTeamMembers(tournamentId: string): Promise<ResolvedTeamMember[]> {
  const rows = await getDb()
    .select(memberSelection())
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .orderBy(tournamentTeamMembers.slotIndex);

  return rows
    .map(toResolvedMember)
    .filter((m): m is ResolvedTeamMember => m != null);
}

/** Same resolution, grouped by teamId — the common shape callers need for match rosters. */
export async function resolveTeamMembersByTeamIds(
  teamIds: string[],
): Promise<Map<string, ResolvedTeamMember[]>> {
  if (!teamIds.length) return new Map();

  const rows = await getDb()
    .select(memberSelection())
    .from(tournamentTeamMembers)
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .where(inArray(tournamentTeamMembers.teamId, teamIds))
    .orderBy(tournamentTeamMembers.slotIndex);

  const map = new Map<string, ResolvedTeamMember[]>();
  for (const row of rows) {
    const resolved = toResolvedMember(row);
    if (!resolved) continue;
    const list = map.get(resolved.teamId) ?? [];
    list.push(resolved);
    map.set(resolved.teamId, list);
  }
  return map;
}
