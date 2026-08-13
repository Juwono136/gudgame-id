import { isBracketSeriesChildLeg } from "@/lib/tournaments/brackets/bracket-metadata";

export type KnockoutBracketSlotRow = {
  roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  metadata: unknown;
};

function isKnockoutSlotParent(row: { metadata: unknown }): boolean {
  return !isBracketSeriesChildLeg(row.metadata);
}

/** True when knockout exists but entry slots (play-in / R1) have no teams yet. */
export function knockoutBracketEntryNeedsSeeding(
  rows: KnockoutBracketSlotRow[],
): boolean {
  const entrySlots = rows.filter(
    (r) =>
      isKnockoutSlotParent(r) &&
      (r.roundNumber === 0 || r.roundNumber === 1) &&
      r.matchNumber !== 999,
  );
  if (entrySlots.length === 0) return false;
  return !entrySlots.some((r) => r.teamAId || r.teamBId);
}
