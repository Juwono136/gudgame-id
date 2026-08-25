import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";

/**
 * A team slot resolved to whichever identity fills it:
 * Gud Game user, partner guest, or Official pending invite (pre-claim).
 */
export type ResolvedTeamMember = {
  /** userId, partnerPlayerId, or member row id for pending. */
  playerId: string;
  displayName: string;
  kind: "user" | "partner" | "pending";
  teamId: string;
  slotIndex: number;
  role: string;
  pendingEmail?: string | null;
  claimStatus?: "pending" | "claimed" | null;
};

type ResolvedMemberRow = {
  memberId: string;
  teamId: string;
  slotIndex: number;
  role: string;
  userId: string | null;
  partnerPlayerId: string | null;
  userName: string | null;
  partnerFullName: string | null;
  pendingDisplayName: string | null;
  pendingEmail: string | null;
  claimedAt: Date | null;
};

function toResolvedMember(row: ResolvedMemberRow): ResolvedTeamMember | null {
  if (row.userId) {
    return {
      playerId: row.userId,
      displayName: row.userName ?? "Player",
      kind: "user",
      teamId: row.teamId,
      slotIndex: row.slotIndex,
      role: row.role,
      claimStatus: row.claimedAt ? "claimed" : null,
    };
  }
  if (row.partnerPlayerId) {
    return {
      playerId: row.partnerPlayerId,
      displayName: row.partnerFullName ?? "Guest",
      kind: "partner",
      teamId: row.teamId,
      slotIndex: row.slotIndex,
      role: row.role,
    };
  }
  if (row.pendingEmail) {
    return {
      playerId: row.memberId,
      displayName: row.pendingDisplayName ?? "Invited player",
      kind: "pending",
      teamId: row.teamId,
      slotIndex: row.slotIndex,
      role: row.role,
      pendingEmail: row.pendingEmail,
      claimStatus: "pending",
    };
  }
  return null;
}

function memberSelection() {
  return {
    memberId: tournamentTeamMembers.id,
    teamId: tournamentTeamMembers.teamId,
    slotIndex: tournamentTeamMembers.slotIndex,
    role: tournamentTeamMembers.role,
    userId: tournamentTeamMembers.userId,
    partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
    userName: user.name,
    partnerFullName: partnerPlayers.fullName,
    pendingDisplayName: tournamentTeamMembers.pendingDisplayName,
    pendingEmail: tournamentTeamMembers.pendingEmail,
    claimedAt: tournamentTeamMembers.claimedAt,
  };
}

/** All team members (Gud Game users + partner guests + pending invites) for a tournament. */
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
