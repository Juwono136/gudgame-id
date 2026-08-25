/**
 * Group-stage RR "day" / round from fixture playOrder + metadata.
 * Fixture create encodes playOrder as `round * 100 + slot` and stores `round` in metadata.
 * Multi-meeting RR may use round offsets (e.g. 101 = Round 1 of meeting 2).
 */
export function deriveGroupStageRoundNumber(input: {
  playOrder?: number | null;
  metadataRound?: number | null;
}): number {
  if (input.metadataRound != null && Number.isFinite(input.metadataRound) && input.metadataRound > 0) {
    return Math.floor(input.metadataRound);
  }
  const playOrder = input.playOrder;
  if (playOrder == null || !Number.isFinite(playOrder) || playOrder < 0) return 1;
  if (playOrder >= 100) return Math.max(1, Math.floor(playOrder / 100));
  return 1;
}

/** Short tab label: `1`, `2`, or `1·M2` when meeting-offset rounds are used. */
export function formatGroupStageRoundTabLabel(roundNumber: number): string {
  if (roundNumber < 100) return String(roundNumber);
  const meeting = Math.floor(roundNumber / 100) + 1;
  const day = roundNumber % 100;
  if (day <= 0) return String(roundNumber);
  return `${day}·M${meeting}`;
}

export function formatGroupStageRoundTitle(roundNumber: number): string {
  if (roundNumber < 100) return `Round ${roundNumber}`;
  const meeting = Math.floor(roundNumber / 100) + 1;
  const day = roundNumber % 100;
  if (day <= 0) return `Round ${roundNumber}`;
  return `Round ${day} · Meeting ${meeting}`;
}
