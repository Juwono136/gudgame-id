import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import {
  buildActiveCourtLockState,
  isTeamLockedForCourt,
  teamLockReason,
  type ActiveCourtLockState,
} from "@/lib/tournaments/reclub/active-court-lock";

export function buildBracketCourtLockState(
  activeMatches: BracketMatchView[],
  teams: LobbyTeamView[],
  excludeCourtId?: string,
  reclubActive: Pick<import("@/lib/tournaments/reclub/types").ReclubMatchView, "teamAId" | "teamBId" | "courtId">[] = [],
): ActiveCourtLockState {
  const bracketOthers = excludeCourtId
    ? activeMatches.filter((m) => m.courtId !== excludeCourtId)
    : activeMatches;
  const reclubOthers = excludeCourtId
    ? reclubActive.filter((m) => m.courtId !== excludeCourtId)
    : reclubActive;
  return buildActiveCourtLockState([...bracketOthers, ...reclubOthers], teams);
}

export function bracketMatchLockReason(
  match: Pick<BracketMatchView, "teamAId" | "teamBId">,
  lock: ActiveCourtLockState,
  teams: LobbyTeamView[],
): string | null {
  if (match.teamAId) {
    const reason = teamLockReason(match.teamAId, lock, teams);
    if (reason) return reason;
  }
  if (match.teamBId) {
    return teamLockReason(match.teamBId, lock, teams);
  }
  return null;
}

export function isBracketMatchLockedForCourt(
  match: Pick<BracketMatchView, "teamAId" | "teamBId">,
  lock: ActiveCourtLockState,
  teams: LobbyTeamView[],
): boolean {
  if (match.teamAId && isTeamLockedForCourt(match.teamAId, lock, teams)) return true;
  if (match.teamBId && isTeamLockedForCourt(match.teamBId, lock, teams)) return true;
  return false;
}
