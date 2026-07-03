"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPlayerNameList } from "@/lib/format/player-names";
import { FunMatchStatsLegend, FUN_MATCH_STAT_COLUMN_TITLES } from "@/components/tournaments/fun-match/fun-match-stats-legend";
import type { FunMatchSquadStandingsRow } from "@/lib/tournaments/stats/fun-match-standings";
import type { FunMatchStandingsRow } from "@/lib/tournaments/stats/fun-match-standings";

type ColumnKey = "wlt" | "wr" | "diff" | "plusM" | "p" | "g";

const COLUMNS: { key: ColumnKey; label: string; title: string }[] = [
  { key: "wlt", label: "W-L-T", title: FUN_MATCH_STAT_COLUMN_TITLES.wlt },
  { key: "wr", label: "WR", title: FUN_MATCH_STAT_COLUMN_TITLES.wr },
  { key: "diff", label: "Diff", title: FUN_MATCH_STAT_COLUMN_TITLES.diff },
  { key: "plusM", label: "+M", title: FUN_MATCH_STAT_COLUMN_TITLES.plusM },
  { key: "p", label: "P", title: FUN_MATCH_STAT_COLUMN_TITLES.p },
  { key: "g", label: "G", title: FUN_MATCH_STAT_COLUMN_TITLES.g },
];

function StatCells({
  row,
  accent,
  diffPositive = "text-emerald-400",
}: {
  row: { wins: number; losses: number; ties: number; winRate: number; diff: number; compensationPoints: number; points: number; games: number };
  accent?: string;
  diffPositive?: string;
}) {
  return (
    <>
      <td className="px-2 py-2.5 text-center tabular-nums text-cp-muted">
        {row.wins}-{row.losses}-{row.ties}
      </td>
      <td className="px-2 py-2.5 text-center tabular-nums text-cp-muted">{row.winRate}%</td>
      <td
        className={cn(
          "px-2 py-2.5 text-center tabular-nums font-medium",
          row.diff > 0 ? diffPositive : row.diff < 0 ? "text-red-400" : "text-cp-muted",
        )}
      >
        {row.diff > 0 ? `+${row.diff}` : row.diff}
      </td>
      <td className="px-2 py-2.5 text-center tabular-nums text-sky-300/90">
        {row.compensationPoints > 0 ? `+${row.compensationPoints}` : "0"}
      </td>
      <td className={cn("px-2 py-2.5 text-right text-base font-bold tabular-nums sm:px-3", accent)}>
        {row.points}
      </td>
      <td className="hidden px-2 py-2.5 text-center tabular-nums text-cp-muted sm:table-cell">
        {row.games}
      </td>
    </>
  );
}

export function FunMatchPlayerStandingsTable({
  rows,
  profileBasePath,
  className,
}: {
  rows: FunMatchStandingsRow[];
  profileBasePath?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-cp-border", className)}>
      <table className="w-full min-w-[32rem] text-left text-xs sm:text-sm">
        <thead className="bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
          <tr className="border-b border-cp-border">
            <th className="px-3 py-2 sm:px-4">#</th>
            <th className="px-2 py-2">Player</th>
            <th className="hidden px-2 py-2 sm:table-cell">Squad</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center" title={c.title}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-cp-muted">
                No stats yet — play and finalize matches first.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.userId} className="border-b border-cp-border/60 last:border-0">
                <td className="px-3 py-2.5 tabular-nums text-cp-muted sm:px-4">{idx + 1}</td>
                <td className="max-w-[8rem] px-2 py-2.5 sm:max-w-none">
                  {profileBasePath ? (
                    <Link
                      href={`${profileBasePath}/${row.userId}`}
                      className="font-medium text-emerald-400 hover:underline"
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
                <StatCells row={row} accent="text-foreground" />
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t border-cp-border px-3 py-2.5 sm:px-4">
        <FunMatchStatsLegend compact />
      </div>
    </div>
  );
}

export function FunMatchSquadStandingsTable({
  rows,
  className,
  accentVariant = "fun",
}: {
  rows: FunMatchSquadStandingsRow[];
  className?: string;
  accentVariant?: "fun" | "official";
}) {
  const diffPositive = accentVariant === "official" ? "text-cp-primary" : "text-emerald-400";
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-cp-border", className)}>
      <table className="w-full min-w-[36rem] text-left text-xs sm:text-sm">
        <thead className="bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
          <tr className="border-b border-cp-border">
            <th className="px-3 py-2 sm:px-4">#</th>
            <th className="px-2 py-2">Squad</th>
            <th className="hidden px-2 py-2 lg:table-cell">Players</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center" title={c.title}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-cp-muted">
                No squad stats yet.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.teamId} className="border-b border-cp-border/60 last:border-0">
                <td className="px-3 py-2.5 tabular-nums text-cp-muted sm:px-4">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <span className="font-medium text-foreground">{row.name}</span>
                  <span className="mt-0.5 block text-[10px] text-cp-muted lg:hidden">
                    {formatPlayerNameList(row.members)}
                  </span>
                </td>
                <td className="hidden max-w-[10rem] px-2 py-2.5 text-cp-muted lg:table-cell">
                  <span className="line-clamp-2 text-xs leading-relaxed">
                    {formatPlayerNameList(row.members)}
                  </span>
                </td>
                <StatCells row={row} accent="text-foreground" diffPositive={diffPositive} />
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t border-cp-border px-3 py-2.5 sm:px-4">
        <FunMatchStatsLegend compact />
      </div>
    </div>
  );
}
