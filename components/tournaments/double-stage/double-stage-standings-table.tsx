"use client";

import { Badge } from "@/components/ui/badge";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import { cn } from "@/lib/utils";

type DoubleStageStandingsTableProps = {
  group: GroupOverview;
  showQualification?: boolean;
  compact?: boolean;
  /**
   * When match score is race-to-N games, show aggregate games won–lost
   * (e.g. 12–6) instead of a raw +/- point difference.
   */
  scoreDisplay?: "diff" | "games";
  /** Per-group legends are omitted by default — use {@link DoubleStageStandingsLegend} once above. */
  showLegend?: boolean;
};

export type StandingsLegendItem = { key: string; label: string };

export function getDoubleStageStandingsLegend(
  scoreDisplay: "diff" | "games" = "diff",
): StandingsLegendItem[] {
  const showGames = scoreDisplay === "games";
  return [
    { key: "G", label: "Games played (matches)" },
    { key: "W", label: "Wins" },
    { key: "L", label: "Losses" },
    showGames
      ? { key: "S", label: "Skor -> games won - games lost" }
      : { key: "S", label: "Skor -> score difference" },
    { key: "PTS", label: "Standings points" },
  ];
}

export function DoubleStageStandingsLegend({
  scoreDisplay = "diff",
  className,
}: {
  scoreDisplay?: "diff" | "games";
  className?: string;
}) {
  const legend = getDoubleStageStandingsLegend(scoreDisplay);
  return (
    <ul
      className={cn(
        "flex flex-wrap flex-col gap-x-4 gap-y-1 text-[10px] leading-snug text-cp-muted sm:text-xs",
        className,
      )}
      aria-label="Standings column legend"
    >
      {legend.map((item) => (
        <li key={item.key} className="inline-flex items-baseline gap-1">
          <span className="font-semibold tabular-nums text-foreground">{item.key}</span>
          <span className="text-cp-muted">= {item.label}</span>
        </li>
      ))}
    </ul>
  );
}

const thStat =
  "px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:px-2 sm:text-xs";
const tdStat =
  "px-1.5 py-2 text-center tabular-nums whitespace-nowrap sm:px-2";

export function DoubleStageStandingsTable({
  group,
  showQualification = false,
  compact = false,
  scoreDisplay = "diff",
  showLegend = false,
}: DoubleStageStandingsTableProps) {
  const showGames = scoreDisplay === "games";
  const scoreTitle = showGames ? "Skor (games won – games lost)" : "Skor (score difference)";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-cp-border">
        <table className={cn("w-full min-w-[22rem] table-fixed text-sm", compact && "text-xs")}>
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-9" />
            <col className="w-9" />
            <col className="w-9" />
            <col className="w-[3.25rem]" />
            <col className="w-11" />
          </colgroup>
          <thead>
            <tr className="border-b border-cp-border bg-cp-elevated/40">
              <th className={cn(thStat, "w-8 text-left")}>#</th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:px-3 sm:text-xs">
                Team
              </th>
              <th className={thStat} title="Games played (matches)">
                G
              </th>
              <th className={thStat} title="Wins">
                W
              </th>
              <th className={thStat} title="Losses">
                L
              </th>
              <th className={thStat} title={scoreTitle}>
                S
              </th>
              <th className={thStat} title="Standings points">
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((row) => (
              <tr
                key={row.teamId}
                className="border-b border-cp-border/50 last:border-0 even:bg-cp-elevated/15"
              >
                <td className={cn(tdStat, "text-left font-medium")}>{row.rank}</td>
                <td className="min-w-0 px-2 py-2 sm:px-3">
                  <p className="truncate font-medium text-foreground" title={row.teamName}>
                    {row.teamName}
                  </p>
                  {row.players.length > 0 ? (
                    <p
                      className={cn(
                        "mt-0.5 truncate text-cp-muted",
                        compact ? "text-[10px]" : "text-[10px] sm:text-xs",
                      )}
                      title={row.players.map((p) => p.displayName).join(", ")}
                    >
                      {row.players.map((p) => p.displayName).join(", ")}
                    </p>
                  ) : null}
                  {showQualification && row.qualificationStatus !== "pending" ? (
                    <Badge
                      variant="muted"
                      className={cn(
                        "mt-1 text-[10px]",
                        row.qualificationStatus === "qualified"
                          ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                          : "opacity-70",
                      )}
                    >
                      {row.qualificationStatus === "qualified" ? "Qualified" : "Eliminated"}
                    </Badge>
                  ) : null}
                </td>
                <td className={tdStat}>{row.played}</td>
                <td className={tdStat}>{row.wins}</td>
                <td className={tdStat}>{row.losses}</td>
                <td className={cn(tdStat, "text-[11px] sm:text-sm")}>
                  {showGames ? `${row.scoreFor}–${row.scoreAgainst}` : row.scoreDiff}
                </td>
                <td className={cn(tdStat, "font-semibold")}>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showLegend ? (
        <DoubleStageStandingsLegend scoreDisplay={scoreDisplay} className="flex-col sm:flex-row" />
      ) : null}
    </div>
  );
}
