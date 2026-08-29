"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FunMatchStatsLegend, FUN_MATCH_STAT_COLUMN_TITLES } from "@/components/tournaments/fun-match/fun-match-stats-legend";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
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
  visible,
  cellClassName,
}: {
  row: { wins: number; losses: number; ties: number; winRate: number; diff: number; compensationPoints: number; points: number; games: number };
  accent?: string;
  diffPositive?: string;
  visible?: Set<string>;
  cellClassName?: (key: string) => string | undefined;
}) {
  const show = (key: string) => !visible || visible.has(key);
  const cls = (key: string, extra?: string) => cn(cellClassName?.(key), extra);
  return (
    <>
      {show("wlt") ? (
        <td className={cls("wlt", "text-center tabular-nums text-cp-muted")}>
          {row.wins}-{row.losses}-{row.ties}
        </td>
      ) : null}
      {show("wr") ? (
        <td className={cls("wr", "text-center tabular-nums text-cp-muted")}>{row.winRate}%</td>
      ) : null}
      {show("diff") ? (
        <td
          className={cls(
            "diff",
            cn(
              "text-center tabular-nums font-medium",
              row.diff > 0 ? diffPositive : row.diff < 0 ? "text-red-400" : "text-cp-muted",
            ),
          )}
        >
          {row.diff > 0 ? `+${row.diff}` : row.diff}
        </td>
      ) : null}
      {show("plusM") ? (
        <td className={cls("plusM", "text-center tabular-nums text-sky-300/90")}>
          {row.compensationPoints > 0 ? `+${row.compensationPoints}` : "0"}
        </td>
      ) : null}
      {show("p") ? (
        <td className={cls("p", cn("text-right text-base font-bold tabular-nums sm:px-3", accent))}>
          {row.points}
        </td>
      ) : null}
      {show("g") ? (
        <td className={cls("g", "text-center tabular-nums text-cp-muted")}>{row.games}</td>
      ) : null}
    </>
  );
}

export function FunMatchPlayerStandingsTable({
  rows,
  profileBasePath,
  className,
  hideLegend = false,
  visibleColumns,
  compactOnMobile = false,
}: {
  rows: FunMatchStandingsRow[];
  profileBasePath?: string;
  className?: string;
  hideLegend?: boolean;
  visibleColumns?: Array<"squad" | "wlt" | "wr" | "diff" | "plusM" | "p" | "g">;
  /** On phones: full-width 4-col grid; full table from md+. */
  compactOnMobile?: boolean;
}) {
  const visible = visibleColumns ? new Set<string>(visibleColumns) : null;
  const show = (key: string) => !visible || visible.has(key);
  const columns = COLUMNS.filter((c) => show(c.key));
  const colSpan = 2 + (show("squad") ? 1 : 0) + columns.length;

  return (
    <div className={cn("w-full", className)}>
      {compactOnMobile ? (
        <div className="w-full md:hidden">
          <div className="grid w-full grid-cols-[2rem_minmax(0,1fr)_4.75rem_2.75rem] items-center gap-x-3 border-b border-cp-border pb-2 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
            <span>#</span>
            <span>Player</span>
            <span className="text-center">W-L-T</span>
            <span className="text-right">P</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-1 py-8 text-center text-xs text-cp-muted">
              No stats yet — play and finalize matches first.
            </p>
          ) : (
            <ul className="divide-y divide-cp-border/60">
              {rows.map((row, idx) => (
                <li
                  key={row.userId}
                  className="grid w-full grid-cols-[2rem_minmax(0,1fr)_4.75rem_2.75rem] items-center gap-x-3 py-2.5 text-xs"
                >
                  <span className="tabular-nums text-cp-muted">{idx + 1}</span>
                  <div className="min-w-0">
                    {profileBasePath ? (
                      <Link
                        href={`${profileBasePath}/${row.userId}`}
                        className="block truncate font-medium text-emerald-400 hover:underline"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="block truncate font-medium text-foreground">{row.name}</span>
                    )}
                    <span className="mt-0.5 block truncate text-[10px] text-cp-muted">
                      {row.teamName}
                    </span>
                  </div>
                  <span className="text-center tabular-nums text-cp-muted">
                    {row.wins}-{row.losses}-{row.ties}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-foreground">
                    {row.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "w-full overflow-x-auto rounded-xl border border-cp-border",
          compactOnMobile && "hidden md:block",
          className?.includes("border-0") && "border-0",
        )}
      >
        <table className="w-full min-w-[32rem] text-left text-xs sm:text-sm">
          <thead className="bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
            <tr className="border-b border-cp-border">
              <th className="px-2 py-1.5 sm:px-3">#</th>
              <th className="px-2 py-1.5">Player</th>
              {show("squad") ? <th className="px-2 py-2">Squad</th> : null}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-2 py-2 text-center", c.key === "p" && "text-right")}
                  title={c.title}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-cp-muted">
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
                    {!show("squad") ? (
                      <span className="mt-0.5 block truncate text-[10px] text-cp-muted">
                        {row.teamName}
                      </span>
                    ) : null}
                  </td>
                  {show("squad") ? (
                    <td className="max-w-[6rem] truncate px-2 py-2.5 text-cp-muted">
                      {row.teamName}
                    </td>
                  ) : null}
                  <StatCells row={row} accent="text-foreground" visible={visible ?? undefined} />
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!hideLegend ? (
          <div className="border-t border-cp-border px-3 py-2.5 sm:px-4">
            <FunMatchStatsLegend compact />
          </div>
        ) : null}
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
                  <span className="mt-0.5 block lg:hidden">
                    <TeamPlayerList names={row.members} maxNames={4} compact />
                  </span>
                </td>
                <td className="hidden max-w-[10rem] px-2 py-2.5 text-cp-muted lg:table-cell">
                  <TeamPlayerList names={row.members} maxNames={4} />
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
