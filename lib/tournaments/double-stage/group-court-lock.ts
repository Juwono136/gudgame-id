import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";

export type GroupCourtReservedPick = {
  matchId: string;
  teamAId?: string | null;
  teamBId?: string | null;
};

export type GroupCourtLockState = {
  busyTeamIds: Set<string>;
  reservedMatchIds: Set<string>;
};

export function buildGroupCourtLockState(
  activeMatches: GroupMatchView[],
  options?: {
    excludeCourtId?: string;
    reservedPicks?: GroupCourtReservedPick[];
  },
): GroupCourtLockState {
  const busyTeamIds = new Set<string>();
  const reservedMatchIds = new Set<string>();
  const excludeCourtId = options?.excludeCourtId;

  for (const m of activeMatches) {
    if (m.status !== "in_progress") continue;
    if (excludeCourtId && m.courtId === excludeCourtId) continue;
    if (m.teamAId) busyTeamIds.add(m.teamAId);
    if (m.teamBId) busyTeamIds.add(m.teamBId);
  }

  for (const pick of options?.reservedPicks ?? []) {
    if (!pick.matchId) continue;
    reservedMatchIds.add(pick.matchId);
    if (pick.teamAId) busyTeamIds.add(pick.teamAId);
    if (pick.teamBId) busyTeamIds.add(pick.teamBId);
  }

  return { busyTeamIds, reservedMatchIds };
}

export function isGroupMatchLockedForCourt(
  match: Pick<GroupMatchView, "id" | "status" | "teamAId" | "teamBId">,
  lock: GroupCourtLockState,
): boolean {
  if (match.status !== "pending") return true;
  if (lock.reservedMatchIds.has(match.id)) return true;
  if (match.teamAId && lock.busyTeamIds.has(match.teamAId)) return true;
  if (match.teamBId && lock.busyTeamIds.has(match.teamBId)) return true;
  return false;
}

export function groupMatchLockReason(
  match: Pick<
    GroupMatchView,
    "id" | "status" | "teamAId" | "teamBId" | "teamAName" | "teamBName"
  >,
  lock: GroupCourtLockState,
): string | null {
  if (match.status !== "pending") return "Match already started or finished";
  if (lock.reservedMatchIds.has(match.id)) {
    return "This fixture is already assigned to another court";
  }
  if (match.teamAId && lock.busyTeamIds.has(match.teamAId)) {
    return `${match.teamAName ?? "Team A"} is already playing or reserved on another court`;
  }
  if (match.teamBId && lock.busyTeamIds.has(match.teamBId)) {
    return `${match.teamBName ?? "Team B"} is already playing or reserved on another court`;
  }
  return null;
}
