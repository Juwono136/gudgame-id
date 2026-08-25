"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OfficialPlayerStandingRow } from "@/lib/tournaments/stats/official-standings";
import type { FunMatchStandingsRow } from "@/lib/tournaments/stats/fun-match-standings";

function playerRowKey(row: { teamName?: string; name: string; userId?: string }): string {
  if (row.userId) return row.userId;
  return `${row.teamName ?? ""}::${row.name}`.toLowerCase();
}

type CompactStandingRow = {
  name: string;
  userId?: string;
  teamName?: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
};

/**
 * Side-panel standings: # · Player · W-L-T · P only.
 * Full stats live on Groups / expandable history — keeps Live scoring usable.
 */
export function CompactLiveStandingsTable({
  rows,
  profileBasePath,
  className,
  emptyLabel = "Standings appear after matches are recorded.",
}: {
  rows: CompactStandingRow[];
  profileBasePath?: string;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
          <tr className="border-b border-cp-border">
            <th className="w-8 py-1.5 pl-1 pr-1">#</th>
            <th className="py-1.5 pr-2" title="Player">
              Player
            </th>
            <th className="py-1.5 text-center" title="Wins – Losses – Ties">
              W-L-T
            </th>
            <th className="py-1.5 pr-1 text-right" title="Ranking points">
              P
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-1 py-6 text-center text-cp-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={playerRowKey(row)}
                className="border-b border-cp-border/50 last:border-0"
              >
                <td className="py-1.5 pl-1 tabular-nums text-cp-muted">{idx + 1}</td>
                <td className="max-w-[9rem] truncate py-1.5 pr-2 sm:max-w-[12rem]">
                  {profileBasePath && row.userId ? (
                    <Link
                      href={`${profileBasePath}/${row.userId}`}
                      className="font-medium text-cp-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{row.name}</span>
                  )}
                </td>
                <td className="py-1.5 text-center tabular-nums text-cp-muted">
                  {row.wins}-{row.losses}-{row.ties}
                </td>
                <td className="py-1.5 pr-1 text-right text-sm font-bold tabular-nums text-cp-primary">
                  {row.points}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function toCompactOfficialRows(
  rows: OfficialPlayerStandingRow[],
): CompactStandingRow[] {
  return rows.map((r) => ({
    name: r.name,
    userId: r.userId,
    teamName: r.teamName,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    points: r.points,
  }));
}

export function toCompactFunRows(rows: FunMatchStandingsRow[]): CompactStandingRow[] {
  return rows.map((r) => ({
    name: r.name,
    userId: r.userId,
    teamName: r.teamName,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    points: r.points,
  }));
}
