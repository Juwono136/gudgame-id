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

export function canRenameReclubSquad(input: {
  tournamentStatus: string;
  hasActiveMatch: boolean;
  canManage: boolean;
  captainUserId: string | null;
  currentUserId: string | null;
}): boolean {
  if (input.hasActiveMatch) return false;
  if (input.tournamentStatus === "completed" || input.tournamentStatus === "cancelled") {
    return false;
  }
  if (input.canManage) return true;
  return Boolean(
    input.currentUserId &&
      input.captainUserId &&
      input.captainUserId === input.currentUserId,
  );
}

export function canCreateReclubSquad(input: {
  tournamentStatus: string;
  hasActiveMatch: boolean;
  teamsAtCapacity: boolean;
}): boolean {
  if (input.hasActiveMatch) return false;
  if (input.tournamentStatus === "completed" || input.tournamentStatus === "cancelled") {
    return false;
  }
  return !input.teamsAtCapacity;
}
