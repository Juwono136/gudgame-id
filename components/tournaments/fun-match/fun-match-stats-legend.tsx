"use client";

import { cn } from "@/lib/utils";

export type TournamentStatsLegendVariant = "fun" | "official-player";

const FUN_STAT_LEGEND = [
  { abbr: "W-L-T", description: "Wins, losses, and ties" },
  { abbr: "WR", description: "Win rate (%)" },
  { abbr: "Diff", description: "Point difference (scored minus conceded)" },
  { abbr: "+M", description: "Compensation points for fewer games played" },
  { abbr: "P", description: "Ranking points (3 per win, 1 per tie)" },
  { abbr: "G", description: "Games played" },
] as const;

const OFFICIAL_PLAYER_STAT_LEGEND = [
  { abbr: "W-L-T", description: "Wins, losses, and ties" },
  { abbr: "WR", description: "Win rate (%)" },
  { abbr: "Diff", description: "Point difference (scored minus conceded)" },
  { abbr: "P", description: "Ranking points (3 per win, 1 per tie)" },
  { abbr: "Pts+", description: "Total points scored in matches" },
  { abbr: "Log", description: "Scoring actions logged during live scoring" },
  { abbr: "G", description: "Games played" },
] as const;

type FunMatchStatsLegendProps = {
  className?: string;
  compact?: boolean;
  variant?: TournamentStatsLegendVariant;
};

export function FunMatchStatsLegend({
  className,
  compact = false,
  variant = "fun",
}: FunMatchStatsLegendProps) {
  const items =
    variant === "official-player" ? OFFICIAL_PLAYER_STAT_LEGEND : FUN_STAT_LEGEND;

  if (compact) {
    return (
      <p className={cn("text-[10px] leading-relaxed text-cp-muted sm:text-[11px]", className)}>
        {items.map((item, i) => (
          <span key={item.abbr}>
            {i > 0 ? " · " : null}
            <span className="font-semibold text-foreground/80">{item.abbr}</span>
            {" = "}
            {item.description}
          </span>
        ))}
      </p>
    );
  }

  return (
    <dl
      className={cn(
        "grid gap-x-4 gap-y-1.5 text-[10px] text-cp-muted sm:grid-cols-2 sm:text-[11px]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.abbr} className="flex gap-2">
          <dt className="shrink-0 font-semibold tabular-nums text-foreground/80">{item.abbr}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Column header tooltips shared with standings tables. */
export const FUN_MATCH_STAT_COLUMN_TITLES = {
  wlt: "Wins, losses, and ties",
  wr: "Win rate (%)",
  diff: "Point difference (scored minus conceded)",
  plusM: "Compensation points for fewer games played",
  p: "Ranking points (3 per win, 1 per tie)",
  g: "Games played",
} as const;

export const OFFICIAL_PLAYER_STAT_COLUMN_TITLES = {
  wlt: FUN_MATCH_STAT_COLUMN_TITLES.wlt,
  wr: FUN_MATCH_STAT_COLUMN_TITLES.wr,
  diff: FUN_MATCH_STAT_COLUMN_TITLES.diff,
  p: FUN_MATCH_STAT_COLUMN_TITLES.p,
  ptsPlus: "Total points scored in matches",
  log: "Scoring actions logged during live scoring",
  g: FUN_MATCH_STAT_COLUMN_TITLES.g,
} as const;
