import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";

export type ActiveCourtLockState = {
  busyTeamIds: Set<string>;
  busyPlayerIds: Set<string>;
};

export function buildActiveCourtLockState(
  activeMatches: Pick<ReclubMatchView, "teamAId" | "teamBId">[],
  teams: LobbyTeamView[],
): ActiveCourtLockState {
  const busyTeamIds = new Set<string>();
  const busyPlayerIds = new Set<string>();

  for (const match of activeMatches) {
    for (const teamId of [match.teamAId, match.teamBId]) {
      if (!teamId) continue;
      busyTeamIds.add(teamId);
      const team = teams.find((t) => t.id === teamId);
      for (const member of team?.members ?? []) {
        busyPlayerIds.add(member.userId);
      }
    }
  }

  return { busyTeamIds, busyPlayerIds };
}

export function isTeamLockedForCourt(
  teamId: string,
  lock: ActiveCourtLockState,
  teams: LobbyTeamView[],
  options?: { allowTeamIds?: Set<string> },
): boolean {
  if (options?.allowTeamIds?.has(teamId)) return false;
  if (lock.busyTeamIds.has(teamId)) return true;

  const team = teams.find((t) => t.id === teamId);
  if (!team) return false;

  return team.members.some((m) => lock.busyPlayerIds.has(m.userId));
}

export function teamLockReason(
  teamId: string,
  lock: ActiveCourtLockState,
  teams: LobbyTeamView[],
): string | null {
  if (lock.busyTeamIds.has(teamId)) {
    return "Already playing on another court";
  }
  const team = teams.find((t) => t.id === teamId);
  const busyMember = team?.members.find((m) => lock.busyPlayerIds.has(m.userId));
  if (busyMember) {
    return "A player from this squad is active on another court";
  }
  return null;
}
