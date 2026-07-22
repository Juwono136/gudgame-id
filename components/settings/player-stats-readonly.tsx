"use client";

import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";
import { formatRankingPoints, CAREER_POINTS_LABEL } from "@/lib/player/format-ranking-points";

type PlayerStatsReadonlyProps = {
  profile: PlayerWikiProfileView | null;
};

function formatStat(
  value: number | null,
  kind: "rank" | "points" | "percent",
): { display: string; title?: string } {
  if (value == null) return { display: "—" };
  if (kind === "rank") return { display: `#${value.toLocaleString("en-US")}` };
  if (kind === "percent") return { display: `${value}%` };
  const fmt = formatRankingPoints(value);
  return { display: fmt.display, title: fmt.title };
}

export function PlayerStatsReadonly({ profile }: PlayerStatsReadonlyProps) {
  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/40 p-5 text-center dark:bg-cp-elevated/20">
        <p className="text-sm text-cp-muted">
          Tournament statistics will appear here once you compete in events on Gud Game.
        </p>
      </div>
    );
  }

  const stats = profile.careerStats;
  const metrics = [
    stats.worldRank != null
      ? { label: "World rank", ...formatStat(stats.worldRank, "rank") }
      : null,
    stats.totalPoints != null
      ? { label: CAREER_POINTS_LABEL, ...formatStat(stats.totalPoints, "points") }
      : null,
    stats.winRate != null
      ? { label: "Win rate", ...formatStat(stats.winRate, "percent") }
      : null,
  ].filter(Boolean) as { label: string; display: string; title?: string }[];

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
              <p
                className="mt-1.5 text-xl font-bold tabular-nums text-foreground"
                title={metric.title}
              >
                {metric.display}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-cp-muted">
        These figures update automatically from tournament results and cannot be edited here.
      </p>
    </div>
  );
}
