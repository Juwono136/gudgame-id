/**
 * Compact, professional formatting for ranking / career point totals.
 * Prefers readable magnitudes (1.2K / 1.25M) with full locale value available via title.
 */
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
  nextLabel: string | null;
  current: number;
  target: number;
  percent: number;
} | null {
  if (points == null || Number.isNaN(points)) return null;
  const thresholds = [
    { label: "Menengah", at: 1000 },
    { label: "Pro", at: 5000 },
    { label: "Gold", at: 10000 },
  ] as const;
  for (let i = 0; i < thresholds.length; i++) {
    const next = thresholds[i]!;
    if (points < next.at) {
      const prev = i === 0 ? 0 : thresholds[i - 1]!.at;
      const span = next.at - prev;
      const percent = Math.max(0, Math.min(100, Math.round(((points - prev) / span) * 100)));
      return { nextLabel: next.label, current: Math.round(points), target: next.at, percent };
    }
  }
  return { nextLabel: null, current: Math.round(points), target: Math.round(points), percent: 100 };
}
