import { Trophy } from "lucide-react";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import type { PlayerCareerStats } from "@/lib/wiki/player-career-stats";

type PlayerCareerStatsProps = {
  stats: PlayerCareerStats;
};

function formatStat(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  if (suffix === "%") return `${value}%`;
  if (suffix === "#") return `#${value.toLocaleString()}`;
  return value.toLocaleString();
}

const METRICS = [
  { key: "worldRank" as const, label: "Current rank", format: "#" },
  { key: "totalPoints" as const, label: "Total points", format: "" },
  { key: "winRate" as const, label: "Win rate", format: "%" },
] as const;

export function PlayerCareerStatsSection({ stats }: PlayerCareerStatsProps) {
  const hasAnyStat =
    METRICS.some((m) => stats[m.key] != null) || stats.tier != null;

  return (
    <PlayerPageCard
      title="Career performance"
      description={
        hasAnyStat
          ? "Official tournament statistics"
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
            Pemula · Menengah · Pro · Gold — updated from official tournament results
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {METRICS.map((metric) => (
          <div
            key={metric.key}
            className="rounded-xl border border-cp-border bg-cp-elevated/50 px-4 py-3.5 dark:bg-cp-elevated/30"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
              {metric.label}
            </p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
              {formatStat(stats[metric.key], metric.format)}
            </p>
          </div>
        ))}
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
