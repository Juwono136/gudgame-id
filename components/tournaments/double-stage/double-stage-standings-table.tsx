"use client";

import { Badge } from "@/components/ui/badge";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import { cn } from "@/lib/utils";

type DoubleStageStandingsTableProps = {
  group: GroupOverview;
  showQualification?: boolean;
  compact?: boolean;
};

const STANDINGS_LEGEND = [
  { key: "M", label: "Matches played" },
  { key: "W", label: "Wins" },
  { key: "L", label: "Losses" },
  { key: "+/-", label: "Score difference" },
  { key: "PTS", label: "Standings points" },
] as const;

export function DoubleStageStandingsTable({
  group,
  showQualification = false,
  compact = false,
}: DoubleStageStandingsTableProps) {
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
                title="Score difference"
              >
                +/-
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
                <td className="hidden px-2 py-2 text-right md:table-cell sm:px-3">{row.scoreDiff}</td>
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
        {STANDINGS_LEGEND.map((item) => (
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
