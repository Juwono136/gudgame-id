/**
 * Pure helpers for knockout feeder → next-match slot placement.
 *
 * Provision wires consecutive matchNumbers in pairs into the same nextMatchId
 * (index 0,1 → next[0]; 2,3 → next[1]; …). The earlier match in the pair
 * (odd matchNumber) feeds the top slot (team A); the later (even) feeds bottom (team B).
 */

export type BracketFeederSlot = "a" | "b";

/**
 * Which slot in the next match a feeder with the given matchNumber should occupy.
 */
export function nextMatchSlotForFeeder(matchNumber: number): BracketFeederSlot {
  if (!Number.isFinite(matchNumber) || matchNumber < 1) return "a";
  return matchNumber % 2 === 1 ? "a" : "b";
}

/**
 * Detect whether a winner already occupies the preferred slot on the next match.
 */
export function winnerAlreadyInFeederSlot(
  preferred: BracketFeederSlot,
  next: { teamAId: string | null; teamBId: string | null },
  winnerTeamId: string,
): boolean {
  if (preferred === "a") return next.teamAId === winnerTeamId;
  return next.teamBId === winnerTeamId;
}

/**
 * Build the DB patch that places the winner in the feeder slot and clears the
 * same winner from the opposite slot when it was misplaced earlier.
 */
export function buildFeederSlotPatch(
  preferred: BracketFeederSlot,
  next: { teamAId: string | null; teamBId: string | null },
  winnerTeamId: string,
  winnerName: string,
): {
  teamAId?: string | null;
  teamAName?: string | null;
  teamBId?: string | null;
  teamBName?: string | null;
} {
  if (preferred === "a") {
    const patch: {
      teamAId: string;
      teamAName: string;
      teamBId?: string | null;
      teamBName?: string | null;
    } = { teamAId: winnerTeamId, teamAName: winnerName };
    if (next.teamBId === winnerTeamId) {
      patch.teamBId = null;
      patch.teamBName = null;
    }
    return patch;
  }

  const patch: {
    teamBId: string;
    teamBName: string;
    teamAId?: string | null;
    teamAName?: string | null;
  } = { teamBId: winnerTeamId, teamBName: winnerName };
  if (next.teamAId === winnerTeamId) {
    patch.teamAId = null;
    patch.teamAName = null;
  }
  return patch;
}
