"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FunMatchStatsLegend,
  OFFICIAL_PLAYER_STAT_COLUMN_TITLES,
} from "@/components/tournaments/fun-match/fun-match-stats-legend";
import type { OfficialStandingsColumnId } from "@/components/tournaments/manage/standings-column-picker";
import type { OfficialPlayerStandingRow } from "@/lib/tournaments/stats/official-standings";

function playerRowKey(row: OfficialPlayerStandingRow): string {
  return `${row.teamName}::${row.name}`.toLowerCase();
}

const ALL_OPTIONAL: OfficialStandingsColumnId[] = [
  "team",
  "wlt",
  "wr",
  "diff",
  "p",
  "ptsPlus",
  "log",
  "g",
];

function PlayerName({
  row,
  profileBasePath,
  showTeamBelow,
  onPlayerClick,
}: {
  row: OfficialPlayerStandingRow;
  profileBasePath?: string;
  showTeamBelow?: boolean;
  onPlayerClick?: (row: OfficialPlayerStandingRow) => void;
}) {
  const nameEl = onPlayerClick ? (
    <button
      type="button"
      className="block truncate text-left text-sm font-medium text-cp-primary hover:underline sm:text-[15px]"
      onClick={() => onPlayerClick(row)}
    >
      {row.name}
    </button>
  ) : profileBasePath ? (
    <Link
      href={`${profileBasePath}/${row.userId}`}
      className="block truncate font-medium text-cp-primary hover:underline sm:text-[15px]"
    >
      {row.name}
    </Link>
  ) : (
    <span className="block truncate text-sm font-medium text-foreground sm:text-[15px]">{row.name}</span>
  );

  return (
    <div className="min-w-0">
      {nameEl}
      {showTeamBelow ? (
        <span className="mt-0.5 block truncate text-[10px] text-cp-muted">{row.teamName}</span>
      ) : null}
    </div>
  );
}

/** Mobile-first standings: full-width 4-column grid (# · Player · W-L-T · P). */
function OfficialMobileStandings({
  rows,
  profileBasePath,
  onPlayerClick,
}: {
  rows: OfficialPlayerStandingRow[];
  profileBasePath?: string;
  onPlayerClick?: (row: OfficialPlayerStandingRow) => void;
}) {
  return (
    <div className="w-full md:hidden">
      <div
        className="grid w-full grid-cols-[2rem_minmax(0,1fr)_4.75rem_2.75rem] items-center gap-x-3 border-b border-cp-border pb-2 text-[10px] font-semibold uppercase tracking-wide text-cp-muted"
        role="row"
      >
        <span>#</span>
        <span>Player</span>
        <span className="text-center" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.wlt}>
          W-L-T
        </span>
        <span className="text-right" title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.p}>
          P
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-1 py-8 text-center text-xs text-cp-muted">
          Standings appear after official matches are recorded.
        </p>
      ) : (
        <ul className="divide-y divide-cp-border/60">
          {rows.map((row, idx) => (
            <li
              key={playerRowKey(row)}
              className="grid w-full grid-cols-[2rem_minmax(0,1fr)_4.75rem_2.75rem] items-center gap-x-3 py-2.5 text-xs"
            >
              <span className="tabular-nums text-cp-muted">{idx + 1}</span>
              <PlayerName
                row={row}
                profileBasePath={profileBasePath}
                showTeamBelow
                onPlayerClick={onPlayerClick}
              />
              <span className="text-center tabular-nums text-cp-muted">
                {row.wins}-{row.losses}-{row.ties}
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-cp-primary">
                {row.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OfficialPlayerStandingsTable({
  rows,
  profileBasePath,
  className,
  hideLegend = false,
  visibleColumns,
  compactOnMobile = false,
  onPlayerClick,
}: {
  rows: OfficialPlayerStandingRow[];
  profileBasePath?: string;
  className?: string;
  hideLegend?: boolean;
  visibleColumns?: OfficialStandingsColumnId[];
  /**
   * Live scoring / narrow panels: on phones use a full-width 4-col grid;
   * full table from `md` up.
   */
  compactOnMobile?: boolean;
  onPlayerClick?: (row: OfficialPlayerStandingRow) => void;
}) {
  const cols = new Set(visibleColumns ?? ALL_OPTIONAL);
  const show = (id: OfficialStandingsColumnId) => cols.has(id);
  const colSpan =
    2 +
    (show("team") ? 1 : 0) +
    (show("wlt") ? 1 : 0) +
    (show("wr") ? 1 : 0) +
    (show("diff") ? 1 : 0) +
    (show("p") ? 1 : 0) +
    (show("ptsPlus") ? 1 : 0) +
    (show("log") ? 1 : 0) +
    (show("g") ? 1 : 0);

  const th = "whitespace-nowrap px-2 py-2 text-center";
  const td = "whitespace-nowrap px-2 py-2.5 text-center";

  return (
    <div className={cn("w-full", className)}>
      {compactOnMobile ? (
        <OfficialMobileStandings
          rows={rows}
          profileBasePath={profileBasePath}
          onPlayerClick={onPlayerClick}
        />
      ) : null}

      <div
        className={cn(
          "w-full overflow-x-auto rounded-xl border border-cp-border",
          compactOnMobile && "hidden md:block",
          className?.includes("border-0") && "border-0",
        )}
      >
        <table className="w-full min-w-[36rem] text-left text-xs sm:text-sm">
          <thead className="bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
            <tr className="border-b border-cp-border">
              <th className="px-2 py-1.5 sm:px-3">#</th>
              <th className="px-2 py-1.5">Player</th>
              {show("team") ? <th className="px-2 py-2 text-left">Team</th> : null}
              {show("wlt") ? (
                <th className={th} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.wlt}>
                  W-L-T
                </th>
              ) : null}
              {show("wr") ? (
                <th className={th} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.wr}>
                  WR
                </th>
              ) : null}
              {show("diff") ? (
                <th className={th} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.diff}>
                  Diff
                </th>
              ) : null}
              {show("p") ? (
                <th className={cn(th, "text-right")} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.p}>
                  P
                </th>
              ) : null}
              {show("ptsPlus") ? (
                <th className={th} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.ptsPlus}>
                  Pts+
                </th>
              ) : null}
              {show("log") ? (
                <th className={th} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.log}>
                  Log
                </th>
              ) : null}
              {show("g") ? (
                <th className={th} title={OFFICIAL_PLAYER_STAT_COLUMN_TITLES.g}>
                  G
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-cp-muted">
                  Standings appear after official matches are recorded.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={playerRowKey(row)} className="border-b border-cp-border/60 last:border-0">
                  <td className="px-2 py-2 tabular-nums text-cp-muted sm:px-3">{idx + 1}</td>
                  <td className="max-w-[9rem] px-2 py-2 sm:max-w-[12rem]">
                    <PlayerName
                      row={row}
                      profileBasePath={profileBasePath}
                      showTeamBelow={!show("team")}
                      onPlayerClick={onPlayerClick}
                    />
                  </td>
                  {show("team") ? (
                    <td className="max-w-[7rem] truncate px-2 py-2.5 text-cp-muted">
                      {row.teamName}
                    </td>
                  ) : null}
                  {show("wlt") ? (
                    <td className={cn(td, "tabular-nums text-cp-muted")}>
                      {row.wins}-{row.losses}-{row.ties}
                    </td>
                  ) : null}
                  {show("wr") ? (
                    <td className={cn(td, "tabular-nums text-cp-muted")}>{row.winRate}%</td>
                  ) : null}
                  {show("diff") ? (
                    <td
                      className={cn(
                        td,
                        "tabular-nums font-medium",
                        row.diff > 0
                          ? "text-cp-primary"
                          : row.diff < 0
                            ? "text-red-400"
                            : "text-cp-muted",
                      )}
                    >
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </td>
                  ) : null}
                  {show("p") ? (
                    <td className={cn(td, "text-right text-base font-bold tabular-nums text-cp-primary")}>
                      {row.points}
                    </td>
                  ) : null}
                  {show("ptsPlus") ? (
                    <td className={cn(td, "tabular-nums text-foreground")}>
                      {row.pointsScored.toLocaleString("en-US")}
                    </td>
                  ) : null}
                  {show("log") ? (
                    <td className={cn(td, "tabular-nums text-cp-muted")}>
                      {row.scoringActions.toLocaleString("en-US")}
                    </td>
                  ) : null}
                  {show("g") ? (
                    <td className={cn(td, "tabular-nums text-cp-muted")}>{row.games}</td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!hideLegend ? (
          <div className="border-t border-cp-border px-3 py-2.5 sm:px-4">
            <FunMatchStatsLegend compact variant="official-player" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
