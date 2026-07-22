import { Trophy } from "lucide-react";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import {
  CAREER_POINTS_HINT,
  CAREER_POINTS_LABEL,
  formatRankingPoints,
  nextTierProgress,
} from "@/lib/player/format-ranking-points";
import { PLAYER_TIER_PATH } from "@/lib/player/tier";
import type { PlayerCareerStats } from "@/lib/wiki/player-career-stats";

type PlayerCareerStatsProps = {
  stats: PlayerCareerStats;
};

function formatStat(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  if (suffix === "%") return `${value}%`;
  if (suffix === "#") return `#${value.toLocaleString("en-US")}`;
  return value.toLocaleString("en-US");
}

export function PlayerCareerStatsSection({ stats }: PlayerCareerStatsProps) {
  const hasAnyStat =
    stats.worldRank != null ||
    stats.totalPoints != null ||
    stats.winRate != null ||
    stats.tier != null;

  const pointsFmt = formatRankingPoints(stats.totalPoints);
  const progress = nextTierProgress(stats.totalPoints);

  return (
    <PlayerPageCard
      title="Career performance"
      description={
        hasAnyStat
          ? "Official tournament results update rank, career points, and tier automatically."
          : "Stats will appear here once tournament results are recorded."
      }
    >
      {stats.tier ? (
        <div className="mb-4 rounded-xl border border-cp-primary/30 bg-cp-primary/10 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            Tier
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.tier}</p>
          <p className="mt-1 text-xs text-cp-muted">
            Progression path: {PLAYER_TIER_PATH.join(" → ")}
          </p>
          {progress && progress.nextLabel ? (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-cp-muted">
                <span>
                  Progress to{" "}
                  <span className="font-medium text-foreground">{progress.nextLabel}</span>
                </span>
                <span className="tabular-nums" title={pointsFmt.title}>
                  {progress.current.toLocaleString("en-US")} /{" "}
                  {progress.target.toLocaleString("en-US")} pts
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cp-elevated">
                <div
                  className="h-full rounded-full bg-cp-primary transition-[width]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          ) : progress && !progress.nextLabel ? (
            <p className="mt-2 text-xs text-cp-muted">Highest tier reached</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-cp-border bg-cp-elevated/50 px-4 py-3.5 dark:bg-cp-elevated/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
            Current rank
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {formatStat(stats.worldRank, "#")}
          </p>
        </div>
        <div className="rounded-xl border border-cp-border bg-cp-elevated/50 px-4 py-3.5 dark:bg-cp-elevated/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
            {CAREER_POINTS_LABEL}
          </p>
          <p
            className="mt-1.5 text-xl font-bold tabular-nums text-foreground sm:text-2xl"
            title={pointsFmt.title}
          >
            {pointsFmt.display}
          </p>
          {pointsFmt.abbreviated ? (
            <p className="mt-0.5 text-[10px] text-cp-muted">{pointsFmt.title} pts</p>
          ) : (
            <p className="mt-0.5 text-[10px] leading-relaxed text-cp-muted">{CAREER_POINTS_HINT}</p>
          )}
        </div>
        <div className="rounded-xl border border-cp-border bg-cp-elevated/50 px-4 py-3.5 dark:bg-cp-elevated/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
            Win rate
          </p>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {formatStat(stats.winRate, "%")}
          </p>
        </div>
      </div>

      {!hasAnyStat ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-3">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-cp-muted" />
          <p className="text-xs leading-relaxed text-cp-muted sm:text-sm">
            This player has not competed in recorded official tournaments yet. Rankings, win
            rate, and tier update automatically from match results.
          </p>
        </div>
      ) : null}
    </PlayerPageCard>
  );
}
