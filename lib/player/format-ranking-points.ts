/** Compact, professional formatting for ranking / career point totals. */
import {
  PLAYER_TIER_LABELS,
  PLAYER_TIER_LEVELS,
  PLAYER_TIER_POINT_THRESHOLDS,
  deriveTierFromPoints,
  type PlayerTierLevel,
} from "@/lib/player/tier";

/** User-facing label for career point totals on public profiles. */
export const CAREER_POINTS_LABEL = "Career points";

/** Short helper shown under the career points stat. */
export const CAREER_POINTS_HINT =
  "Wins add points and losses subtract them. The amount depends on the tournament tier (Bronze ±1, Silver ±3, Gold ±5, Platinum ±8, International ±10 per match).";

/** One-line summary for list/table headers. */
export const CAREER_POINTS_SHORT_HINT = "Total from official match wins (+) and losses (−)";

export function formatRankingPoints(value: number | null | undefined): {
  display: string;
  title: string;
  abbreviated: boolean;
} {
  if (value == null || Number.isNaN(value)) {
    return { display: "—", title: "No ranking points yet", abbreviated: false };
  }

  const rounded = Math.round(value);
  const title = rounded.toLocaleString("en-US");

  if (Math.abs(rounded) < 10_000) {
    return { display: title, title, abbreviated: false };
  }

  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";

  if (abs < 1_000_000) {
    const k = abs / 1_000;
    const display = `${sign}${k >= 100 ? Math.round(k).toString() : k.toFixed(k >= 10 ? 1 : 2).replace(/\.0$/, "")}K`;
    return { display, title, abbreviated: true };
  }

  const m = abs / 1_000_000;
  const display = `${sign}${m >= 100 ? Math.round(m).toString() : m.toFixed(m >= 10 ? 1 : 2).replace(/\.0+$/, "")}M`;
  return { display, title, abbreviated: true };
}

/** Progress toward the next player tier (for profile UX). */
export function nextTierProgress(points: number | null | undefined): {
  currentTierLevel: PlayerTierLevel | null;
  currentLabel: string | null;
  nextLabel: string | null;
  current: number;
  target: number;
  percent: number;
} | null {
  if (points == null || Number.isNaN(points)) return null;
  const net = Math.max(0, Math.round(points));
  const currentTierLevel = deriveTierFromPoints(net);
  const currentLabel = currentTierLevel ? PLAYER_TIER_LABELS[currentTierLevel] : null;

  const thresholds = PLAYER_TIER_LEVELS.slice(1).map((tier) => ({
    label: PLAYER_TIER_LABELS[tier],
    at: PLAYER_TIER_POINT_THRESHOLDS[tier],
  }));

  for (let i = 0; i < thresholds.length; i++) {
    const next = thresholds[i]!;
    if (net < next.at) {
      const prev = i === 0 ? 0 : thresholds[i - 1]!.at;
      const span = next.at - prev;
      const percent = Math.max(0, Math.min(100, Math.round(((net - prev) / span) * 100)));
      return {
        currentTierLevel,
        currentLabel,
        nextLabel: next.label,
        current: net,
        target: next.at,
        percent,
      };
    }
  }

  return {
    currentTierLevel,
    currentLabel,
    nextLabel: null,
    current: net,
    target: net,
    percent: 100,
  };
}
