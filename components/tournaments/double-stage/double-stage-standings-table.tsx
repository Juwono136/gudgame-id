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
};

const STANDINGS_LEGEND_BASE = [
  { key: "M", label: "Matches played" },
  { key: "W", label: "Wins" },
  { key: "L", label: "Losses" },
  { key: "PTS", label: "Standings points" },
] as const;

export function DoubleStageStandingsTable({
  group,
  showQualification = false,
  compact = false,
  scoreDisplay = "diff",
}: DoubleStageStandingsTableProps) {
  const showGames = scoreDisplay === "games";
  const legend = [
    ...STANDINGS_LEGEND_BASE.slice(0, 3),
    showGames
      ? { key: "Game", label: "Games won – games lost" }
      : { key: "+/-", label: "Score difference" },
    STANDINGS_LEGEND_BASE[3],
  ];

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-cp-border">
        <table className={cn("w-full text-sm", compact && "text-xs")}>
          <thead>
            <tr className="border-b border-cp-border bg-cp-elevated/40 text-left text-[10px] uppercase tracking-wide text-cp-muted sm:text-xs">
              <th className="px-2 py-2 sm:px-3">#</th>
              <th className="px-2 py-2 sm:px-3">Team</th>
              <th
                className="hidden px-2 py-2 text-right sm:table-cell sm:px-3"
                title="Matches played"
              >
                M
              </th>
              <th className="px-2 py-2 text-right sm:px-3" title="Wins">
                W
              </th>
              <th className="px-2 py-2 text-right sm:px-3" title="Losses">
                L
              </th>
              <th
                className="hidden px-2 py-2 text-right md:table-cell sm:px-3"
                title={showGames ? "Games won – games lost" : "Score difference"}
              >
                {showGames ? "Game" : "+/-"}
              </th>
              <th className="px-2 py-2 text-right sm:px-3" title="Standings points">
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
                <td className="px-2 py-2 font-medium sm:px-3">{row.rank}</td>
                <td className="px-2 py-2 sm:px-3">
                  <p className="font-medium text-foreground">{row.teamName}</p>
                  {row.players.length > 0 ? (
                    <p
                      className={cn(
                        "mt-0.5 line-clamp-2 text-cp-muted",
                        compact ? "text-[10px]" : "text-[10px] sm:text-xs",
                      )}
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
                <td className="hidden px-2 py-2 text-right sm:table-cell sm:px-3">{row.played}</td>
                <td className="px-2 py-2 text-right sm:px-3">{row.wins}</td>
                <td className="px-2 py-2 text-right sm:px-3">{row.losses}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums md:table-cell sm:px-3">
                  {showGames ? `${row.scoreFor}–${row.scoreAgainst}` : row.scoreDiff}
                </td>
                <td className="px-2 py-2 text-right font-semibold sm:px-3">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className={cn(
          "space-y-0.5 text-cp-muted",
          compact ? "text-[10px] leading-snug" : "text-[10px] sm:text-xs",
        )}
        aria-label="Standings column legend"
      >
        {legend.map((item) => (
          <li key={item.key}>
            <span className="font-semibold tabular-nums text-foreground">{item.key}</span>
            {" = "}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
