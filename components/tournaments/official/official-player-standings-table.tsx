"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FunMatchStatsLegend,
  OFFICIAL_PLAYER_STAT_COLUMN_TITLES,
} from "@/components/tournaments/fun-match/fun-match-stats-legend";
import type { OfficialPlayerStandingRow } from "@/lib/tournaments/stats/official-standings";

function playerRowKey(row: OfficialPlayerStandingRow): string {
  return `${row.teamName}::${row.name}`.toLowerCase();
}

export function OfficialPlayerStandingsTable({
  rows,
  profileBasePath,
  className,
}: {
  rows: OfficialPlayerStandingRow[];
  profileBasePath?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-cp-border", className)}>
      <table className="w-full min-w-[36rem] text-left text-xs sm:text-sm">
        <thead className="bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
          <tr className="border-b border-cp-border">
            <th className="px-3 py-2 sm:px-4">#</th>
            <th className="px-2 py-2">Player</th>
            <th className="hidden px-2 py-2 sm:table-cell">Team</th>
            <th className="px-2 py-2 text-center" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.wlt}>
              W-L-T
            </th>
            <th className="px-2 py-2 text-center" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.wr}>
              WR
            </th>
            <th className="px-2 py-2 text-center" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.diff}>
              Diff
            </th>
            <th className="px-2 py-2 text-center" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.p}>
              P
            </th>
            <th className="hidden px-2 py-2 text-center sm:table-cell" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.ptsPlus}>
              Pts+
            </th>
            <th className="hidden px-2 py-2 text-center md:table-cell" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.log}>
              Log
            </th>
            <th className="hidden px-2 py-2 text-center lg:table-cell" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.g}>
              G
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-cp-muted">
                Standings appear after official matches are recorded.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={playerRowKey(row)} className="border-b border-cp-border/60 last:border-0">
                <td className="px-3 py-2.5 tabular-nums text-cp-muted sm:px-4">{idx + 1}</td>
                <td className="max-w-[8rem] px-2 py-2.5 sm:max-w-none">
                  {profileBasePath ? (
                    <Link
                      href={`${profileBasePath}/${row.userId}`}
                      className="font-medium text-cp-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{row.name}</span>
                  )}
                  <span className="mt-0.5 block truncate text-[10px] text-cp-muted sm:hidden">
                    {row.teamName}
                  </span>
                </td>
                <td className="hidden max-w-[6rem] truncate px-2 py-2.5 text-cp-muted sm:table-cell">
                  {row.teamName}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-cp-muted">
                  {row.wins}-{row.losses}-{row.ties}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-cp-muted">{row.winRate}%</td>
                <td
                  className={cn(
                    "px-2 py-2.5 text-center tabular-nums font-medium",
                    row.diff > 0 ? "text-cp-primary" : row.diff < 0 ? "text-red-400" : "text-cp-muted",
                  )}
                >
                  {row.diff > 0 ? `+${row.diff}` : row.diff}
                </td>
                <td className="px-2 py-2.5 text-right text-base font-bold tabular-nums text-cp-primary sm:px-3">
                  {row.points}
                </td>
                <td className="hidden px-2 py-2.5 text-center tabular-nums text-foreground sm:table-cell">
                  {row.pointsScored}
                </td>
                <td className="hidden px-2 py-2.5 text-center tabular-nums text-cp-muted md:table-cell">
                  {row.scoringActions}
                </td>
                <td className="hidden px-2 py-2.5 text-center tabular-nums text-cp-muted lg:table-cell">
                  {row.games}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t border-cp-border px-3 py-2.5 sm:px-4">
        <FunMatchStatsLegend compact variant="official-player" />
      </div>
    </div>
  );
}
