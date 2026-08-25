/**
 * Session / standings match win rate — shared across Groups, Fun Match,
 * Official player boards, and session leaderboards.
 *
 * Formula (ITF/FIP-aligned match win %):
 *   WR = wins ÷ matchesPlayed × 100
 *
 * - Denominator is **matches played** (includes draws/ties when recorded).
 * - Not set-win % or game-win % — those stay as SET/GM columns + tie-break helpers.
 * - Ranking still uses PTS / wins first; WR is informational (and a soft tie-break
 *   on some session boards).
 * - One decimal place for consistency across Gud Game surfaces.
 */

/** Fractional match win rate in [0, 1]. */
export function matchWinRateFraction(wins: number, matchesPlayed: number): number {
  if (matchesPlayed <= 0 || wins < 0) return 0;
  return Math.min(1, wins / matchesPlayed);
}

/**
 * Display percent with one decimal (e.g. 66.7).
 * Returns 0 when no matches played.
 */
export function matchWinRatePercent(wins: number, matchesPlayed: number): number {
  const fraction = matchWinRateFraction(wins, matchesPlayed);
  if (fraction <= 0) return 0;
  return Math.round((fraction * 100 + Number.EPSILON) * 10) / 10;
}

/** Format for UI cells: `100%`, `66.7%`, `0%`. */
export function formatMatchWinRate(wins: number, matchesPlayed: number): string {
  return `${matchWinRatePercent(wins, matchesPlayed)}%`;
}

export const MATCH_WIN_RATE_LEGEND =
  "Match win rate (%) = wins ÷ matches played (draws count as matches played)";
