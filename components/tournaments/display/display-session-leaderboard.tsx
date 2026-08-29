"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { cn } from "@/lib/utils";

export type DisplayLeaderboardRow = {
  id: string;
  name: string;
  /** Players / team subtitle under the primary name. */
  subtitle?: string;
  groupName?: string | null;
  wins: number;
  losses: number;
  ties: number;
  /** Total matches / games played. */
  games?: number;
  winRate?: number;
  diff?: number;
  points: number;
  /** Optional legacy one-line stats (unused when wins/points present). */
  stats?: string;
};

const PAGE_INTERVAL_MS = 30_000;
const HEADER_RESERVE = 72;
const FOOTER_RESERVE = 36;
const ROW_HEIGHT_ESTIMATE = 42;
const MIN_ROWS_PER_PAGE = 10;

type DisplaySessionLeaderboardProps = {
  tournamentName: string;
  title?: string;
  rows: DisplayLeaderboardRow[];
  className?: string;
  emptyMessage?: string;
  /** Primary entity column header. */
  entityLabel?: "Team" | "Player";
  showGroupColumn?: boolean;
};

function useTableCapacity(containerRef: RefObject<HTMLElement | null>) {
  const [rowsPerPage, setRowsPerPage] = useState(14);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.clientHeight;
      const available = Math.max(220, height - HEADER_RESERVE - FOOTER_RESERVE);
      setRowsPerPage(Math.max(MIN_ROWS_PER_PAGE, Math.floor(available / ROW_HEIGHT_ESTIMATE)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return rowsPerPage;
}

function formatDiff(diff: number | undefined): string {
  if (diff == null || !Number.isFinite(diff)) return "—";
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

/**
 * Venue TV session leaderboard — compact table with group, games, WR%, diff.
 * Paginated to fit one viewport with room for sponsor banner below.
 */
export function DisplaySessionLeaderboard({
  tournamentName,
  title = "Session leaderboard",
  rows,
  className,
  emptyMessage = "Standings appear after the first match is scored.",
  entityLabel = "Team",
  showGroupColumn = false,
}: DisplaySessionLeaderboardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowsPerPage = useTableCapacity(rootRef);
  const pageSize = Math.max(1, rowsPerPage);

  const pages = useMemo(() => {
    if (!rows.length) return [] as DisplayLeaderboardRow[][];
    const chunks: DisplayLeaderboardRow[][] = [];
    for (let i = 0; i < rows.length; i += pageSize) {
      chunks.push(rows.slice(i, i + pageSize));
    }
    return chunks;
  }, [pageSize, rows]);

  const pageCount = Math.max(1, pages.length);
  const [pageIndex, setPageIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const rowIdsKey = rows.map((r) => r.id).join(",");

  useEffect(() => {
    setPageIndex(0);
    setAnimKey((k) => k + 1);
  }, [pageCount, rowIdsKey]);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = window.setInterval(() => {
      setPageIndex((i) => (i + 1) % pageCount);
      setAnimKey((k) => k + 1);
    }, PAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [pageCount]);

  const currentPage = pages[pageIndex % pageCount] ?? [];
  const startRank = pageIndex * pageSize + 1;

  const gridCols = showGroupColumn
    ? "grid-cols-[2.25rem_minmax(0,1.1fr)_minmax(0,0.75fr)_2.5rem_2.75rem_2.75rem_2.25rem] sm:grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(0,0.85fr)_3rem_3rem_3rem_2.5rem] lg:grid-cols-[2.75rem_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_3.25rem_3.25rem_3.25rem_2.75rem]"
    : "grid-cols-[2.25rem_minmax(0,1.2fr)_2.5rem_2.75rem_2.75rem_2.25rem] sm:grid-cols-[2.5rem_minmax(0,1.35fr)_3rem_3rem_3rem_2.5rem] lg:grid-cols-[2.75rem_minmax(0,1.4fr)_minmax(0,1fr)_3.25rem_3.25rem_3.25rem_2.75rem]";

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex h-full min-h-0 w-full flex-col px-3 py-2 sm:px-5 sm:py-3 lg:px-8 lg:py-4",
        className,
      )}
    >
      <header className="shrink-0 border-b border-white/10 pb-2 sm:pb-2.5">
        <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl lg:text-2xl">
          {tournamentName}
        </h1>
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-white/60 sm:text-sm">{title}</p>
          {pageCount > 1 ? (
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              Page {pageIndex + 1} / {pageCount}
            </p>
          ) : null}
        </div>
      </header>

      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden sm:mt-3">
        {!rows.length ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-white/50">
            {emptyMessage}
          </p>
        ) : (
          <div
            key={animKey}
            className="flex h-full min-h-0 animate-in fade-in duration-500 fill-mode-both flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0a1210] sm:rounded-2xl"
          >
            <div
              className={cn(
                "grid shrink-0 items-center gap-x-2 border-b border-white/10 px-2 py-2 text-[9px] font-semibold uppercase tracking-wide text-white/45 sm:gap-x-2.5 sm:px-3 sm:text-[10px] lg:gap-x-3 lg:px-4",
                gridCols,
              )}
              role="row"
            >
              <span>#</span>
              <span>{entityLabel}</span>
              {showGroupColumn ? <span className="hidden lg:block">Group</span> : null}
              <span className="hidden lg:block">Players</span>
              <span className="text-center" title="Total games">
                G
              </span>
              <span className="text-center" title="Win rate">
                WR
              </span>
              <span className="text-center" title="Score difference">
                +/−
              </span>
              <span className="text-right" title="Points">
                P
              </span>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-white/8 overflow-hidden">
              {currentPage.map((row, i) => {
                const rank = startRank + i;
                const isTop3 = rank <= 3;
                const games =
                  row.games ??
                  row.wins + row.losses + row.ties;
                const winRate =
                  row.winRate ??
                  (games > 0 ? Math.round((row.wins / games) * 100) : 0);
                return (
                  <li
                    key={row.id}
                    className={cn(
                      "grid h-[calc(100%/var(--lb-rows,12))] min-h-[2.35rem] items-center gap-x-2 px-2 py-1 sm:gap-x-2.5 sm:px-3 lg:gap-x-3 lg:px-4",
                      gridCols,
                      isTop3 && "bg-[color:var(--display-primary,#3dba96)]/8",
                    )}
                    style={
                      {
                        ["--lb-rows" as string]: String(Math.max(currentPage.length, 1)),
                      } as CSSProperties
                    }
                  >
                    <span
                      className={cn(
                        "font-mono text-xs font-bold tabular-nums sm:text-sm",
                        isTop3
                          ? "text-[color:var(--display-primary,#3dba96)]"
                          : "text-white/40",
                      )}
                    >
                      {rank}
                    </span>
                    <div className="min-w-0 pr-1">
                      <p className="truncate text-sm font-semibold leading-tight text-white sm:text-[15px] lg:text-base">
                        {row.name}
                      </p>
                      {row.subtitle && !showGroupColumn ? (
                        <p className="mt-0.5 truncate text-[10px] text-white/45 lg:hidden">
                          {row.subtitle}
                        </p>
                      ) : null}
                    </div>
                    {showGroupColumn ? (
                      <p className="hidden truncate text-[11px] text-white/50 lg:block">
                        {row.groupName?.trim() || "—"}
                      </p>
                    ) : null}
                    <p className="hidden truncate text-[11px] leading-snug text-white/50 lg:block">
                      {row.subtitle || "—"}
                    </p>
                    <span className="text-center text-xs tabular-nums text-white/65 sm:text-sm">
                      {games}
                    </span>
                    <span className="text-center text-xs tabular-nums text-white/65 sm:text-sm">
                      {winRate}%
                    </span>
                    <span
                      className={cn(
                        "text-center text-xs tabular-nums sm:text-sm",
                        (row.diff ?? 0) > 0
                          ? "text-[color:var(--display-primary,#6ee7b7)]"
                          : (row.diff ?? 0) < 0
                            ? "text-red-300/90"
                            : "text-white/50",
                      )}
                    >
                      {formatDiff(row.diff)}
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums text-[color:var(--display-primary,#3dba96)] sm:text-base">
                      {row.points}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <div className="mt-2 flex shrink-0 items-center justify-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to leaderboard page ${i + 1}`}
              onClick={() => {
                setPageIndex(i);
                setAnimKey((k) => k + 1);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === pageIndex ? "w-6 bg-white/80" : "w-1.5 bg-white/25 hover:bg-white/45",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
