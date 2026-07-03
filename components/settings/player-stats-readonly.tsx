"use client";

import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";

type PlayerStatsReadonlyProps = {
  profile: PlayerWikiProfileView | null;
};

function formatStat(value: number | null, kind: "rank" | "points" | "percent"): string {
  if (value == null) return "—";
  if (kind === "rank") return `#${value.toLocaleString()}`;
  if (kind === "percent") return `${value}%`;
  return value.toLocaleString();
}

export function PlayerStatsReadonly({ profile }: PlayerStatsReadonlyProps) {
  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/40 p-5 text-center dark:bg-cp-elevated/20">
        <p className="text-sm text-cp-muted">
          Tournament statistics will appear here once you compete in events on TandingBase.
        </p>
      </div>
    );
  }

  const stats = profile.careerStats;
  const metrics = [
    stats.worldRank != null
      ? { label: "World rank", value: formatStat(stats.worldRank, "rank") }
      : null,
    stats.totalPoints != null
      ? { label: "Total points", value: formatStat(stats.totalPoints, "points") }
      : null,
    stats.winRate != null
      ? { label: "Win rate", value: formatStat(stats.winRate, "percent") }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (metrics.length === 0 && !stats.tier) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/40 p-5 text-center dark:bg-cp-elevated/20">
        <p className="text-sm text-cp-muted">
          No tournament results yet. Rankings, points, and win rate are calculated from match data
          and cannot be edited manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats.tier ? (
        <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/5 px-4 py-3 dark:border-cp-primary/20 dark:bg-cp-primary/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            Current tier
          </p>
          <p className="mt-1 text-xl font-bold uppercase text-foreground">{stats.tier}</p>
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-3.5 dark:bg-cp-elevated/25"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                {metric.label}
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-cp-text-dim">
        Stats are sourced from tournament match results. Tier and points update automatically.
      </p>
    </div>
  );
}
