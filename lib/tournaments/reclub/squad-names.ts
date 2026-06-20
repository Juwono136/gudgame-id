export const RECLUB_SQUAD_NAME_MIN = 2;
export const RECLUB_SQUAD_NAME_MAX = 120;

export function validateReclubSquadName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < RECLUB_SQUAD_NAME_MIN) {
    return `Squad name must be at least ${RECLUB_SQUAD_NAME_MIN} characters`;
  }
  if (trimmed.length > RECLUB_SQUAD_NAME_MAX) {
    return `Squad name must be at most ${RECLUB_SQUAD_NAME_MAX} characters`;
  }
  return null;
}

import {
  canJoinReclubSession,
  type ReclubSessionSchedule,
} from "@/lib/tournaments/reclub/session-lifecycle";

export function canRenameReclubSquad(input: {
  session: ReclubSessionSchedule;
  hasActiveMatch: boolean;
  canManage: boolean;
  captainUserId: string | null;
  currentUserId: string | null;
}): boolean {
  if (!canJoinReclubSession(input.session)) return false;
  if (input.hasActiveMatch) return false;
  if (input.canManage) return true;
  return Boolean(
    input.currentUserId &&
      input.captainUserId &&
      input.captainUserId === input.currentUserId,
  );
}

export function canCreateReclubSquad(input: {
  session: ReclubSessionSchedule;
  hasActiveMatch: boolean;
  teamsAtCapacity: boolean;
}): boolean {
  if (!canJoinReclubSession(input.session)) return false;
  if (input.hasActiveMatch) return false;
  return !input.teamsAtCapacity;
}
