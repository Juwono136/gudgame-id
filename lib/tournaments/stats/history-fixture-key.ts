/**
 * Career match-history identity helpers (pure — safe for unit tests).
 * Fixture id is embedded in `player_matches.round` so multi-leg / multi-meeting
 * fixtures do not overwrite each other on replace-sync.
 */

export const PLAYER_MATCH_FIXTURE_MARKER = "·#";

const ROUND_MAX_LEN = 80;

/** Build a stable round label that includes the source match/fixture id. */
export function buildPlayerMatchRoundKey(
  displayLabel: string,
  fixtureId: string | null | undefined,
): string {
  const label = displayLabel.trim() || "Match";
  const id = typeof fixtureId === "string" ? fixtureId.trim() : "";
  if (!id) return label.slice(0, ROUND_MAX_LEN);
  const suffix = ` ${PLAYER_MATCH_FIXTURE_MARKER}${id}`;
  if (label.length + suffix.length <= ROUND_MAX_LEN) return `${label}${suffix}`;
  const keep = Math.max(0, ROUND_MAX_LEN - suffix.length);
  return `${label.slice(0, keep)}${suffix}`;
}

export function playerMatchRoundContainsFixture(
  round: string | null | undefined,
  fixtureId: string,
): boolean {
  if (!round || !fixtureId) return false;
  return round.includes(`${PLAYER_MATCH_FIXTURE_MARKER}${fixtureId}`);
}
