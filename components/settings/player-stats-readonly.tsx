"use client";

import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";
import { PerformanceBars } from "@/components/wiki/performance-bars";

type PlayerStatsReadonlyProps = {
  profile: PlayerWikiProfileView | null;
};

export function PlayerStatsReadonly({ profile }: PlayerStatsReadonlyProps) {
  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/40 p-5 text-center">
        <p className="text-sm text-cp-muted">
          Tournament statistics will appear here once you compete in events on TandingBase.
        </p>
      </div>
    );
  }

  const stats = profile.careerStats;
  const metrics = [
    stats.worldRank != null
      ? { label: "World rank", value: stats.worldRank, max: undefined }
      : null,
    stats.totalPoints != null
      ? { label: "Total points", value: stats.totalPoints, max: undefined }
      : null,
    stats.winRate != null
      ? { label: "Win rate", value: stats.winRate, max: 100 }
      : null,
    stats.careerTitles != null
      ? { label: "Career titles", value: stats.careerTitles, max: undefined }
      : null,
  ].filter(Boolean) as { label: string; value: number; max?: number }[];

  if (metrics.length === 0 && !stats.tier) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/40 p-5 text-center">
        <p className="text-sm text-cp-muted">
          No tournament results yet. Rankings, points, and win rate are calculated from match
          data and cannot be edited manually.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
      {stats.tier ? (
        <p className="mb-4 text-sm">
          <span className="text-cp-muted">Tier: </span>
          <span className="font-semibold uppercase text-foreground">{stats.tier}</span>
        </p>
      ) : null}
      {metrics.length > 0 ? <PerformanceBars metrics={metrics} /> : null}
      <p className="mt-4 text-xs text-cp-text-dim">
        Stats are sourced from tournament match results. Tier and points update automatically.
      </p>
    </div>
  );
}
