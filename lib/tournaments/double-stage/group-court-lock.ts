import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";

export type GroupCourtLockState = {
  busyTeamIds: Set<string>;
};

export function buildGroupCourtLockState(
  activeMatches: GroupMatchView[],
  excludeCourtId?: string,
): GroupCourtLockState {
  const busyTeamIds = new Set<string>();
  for (const m of activeMatches) {
    if (m.status !== "in_progress") continue;
    if (excludeCourtId && m.courtId === excludeCourtId) continue;
    if (m.teamAId) busyTeamIds.add(m.teamAId);
    if (m.teamBId) busyTeamIds.add(m.teamBId);
  }
  return { busyTeamIds };
}

export function isGroupMatchLockedForCourt(
  match: GroupMatchView,
  lock: GroupCourtLockState,
): boolean {
  if (match.status !== "pending") return true;
  if (match.teamAId && lock.busyTeamIds.has(match.teamAId)) return true;
  if (match.teamBId && lock.busyTeamIds.has(match.teamBId)) return true;
  return false;
}

export function groupMatchLockReason(
  match: GroupMatchView,
  lock: GroupCourtLockState,
): string | null {
  if (match.status !== "pending") return "Match already started or finished";
  if (match.teamAId && lock.busyTeamIds.has(match.teamAId)) {
    return `${match.teamAName ?? "Team A"} is already playing on another court`;
  }
  if (match.teamBId && lock.busyTeamIds.has(match.teamBId)) {
    return `${match.teamBName ?? "Team B"} is already playing on another court`;
  }
  return null;
}
