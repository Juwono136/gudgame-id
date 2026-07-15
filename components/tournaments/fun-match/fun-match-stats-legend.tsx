"use client";

import { cn } from "@/lib/utils";

export type TournamentStatsLegendVariant = "fun" | "official-player" | "americano";

const AMERICANO_STAT_LEGEND = [
  { abbr: "W-L-T", description: "Wins, losses, and ties" },
  { abbr: "WR", description: "Win rate (%)" },
  { abbr: "Diff", description: "Point difference (scored minus conceded)" },
  { abbr: "+M", description: "Compensation points for fewer games played" },
  { abbr: "P", description: "Total individual points scored (Americano ranking)" },
  { abbr: "G", description: "Games played" },
] as const;

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
  { abbr: "Pts+", description: "Points scored for your side in completed matches" },
  { abbr: "Log", description: "Live scoring taps logged (falls back to Pts+ when unused)" },
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
    variant === "official-player"
      ? OFFICIAL_PLAYER_STAT_LEGEND
      : variant === "americano"
        ? AMERICANO_STAT_LEGEND
        : FUN_STAT_LEGEND;

  return (
    <ul
      className={cn(
        "space-y-0.5 text-cp-muted",
        compact ? "text-[10px] leading-snug sm:text-[11px]" : "text-[10px] sm:text-[11px]",
        className,
      )}
      aria-label="Standings column legend"
    >
      {items.map((item) => (
        <li key={item.abbr}>
          <span className="font-semibold tabular-nums text-foreground/85">{item.abbr}</span>
          {" = "}
          {item.description}
        </li>
      ))}
    </ul>
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
  ptsPlus: "Points scored for your side in completed matches",
  log: "Live scoring taps logged (falls back to Pts+ when unused)",
  g: FUN_MATCH_STAT_COLUMN_TITLES.g,
} as const;
