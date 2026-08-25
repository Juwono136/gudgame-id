"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { cn } from "@/lib/utils";

export type DisplayLeaderboardRow = {
  id: string;
  name: string;
  /** Players / team subtitle under the primary name. */
  subtitle?: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  /** Optional legacy one-line stats (unused when wins/points present). */
  stats?: string;
};

const PAGE_INTERVAL_MS = 30_000;
const HEADER_RESERVE = 88;
const FOOTER_RESERVE = 40;
const ROW_HEIGHT_ESTIMATE = 48;
const MIN_ROWS_PER_PAGE = 8;

type DisplaySessionLeaderboardProps = {
  tournamentName: string;
  title?: string;
  rows: DisplayLeaderboardRow[];
  className?: string;
  emptyMessage?: string;
  /** Primary entity column header. */
  entityLabel?: "Team" | "Player";
};

function useTableCapacity(containerRef: RefObject<HTMLElement | null>) {
  const [rowsPerPage, setRowsPerPage] = useState(12);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.clientHeight;
      const available = Math.max(240, height - HEADER_RESERVE - FOOTER_RESERVE);
      setRowsPerPage(Math.max(MIN_ROWS_PER_PAGE, Math.floor(available / ROW_HEIGHT_ESTIMATE)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return rowsPerPage;
}

/**
 * Venue TV session leaderboard — table columns like public standings
 * (# · Team/Player · W-L-T · P), paginated to fit one viewport.
 */
export function DisplaySessionLeaderboard({
  tournamentName,
  title = "Session leaderboard",
  rows,
  className,
  emptyMessage = "Standings appear after the first match is scored.",
  entityLabel = "Team",
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

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex h-full min-h-0 w-full flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-10 lg:py-5",
        className,
      )}
    >
      <header className="shrink-0 border-b border-white/10 pb-2.5 sm:pb-3">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
          {tournamentName}
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/60">{title}</p>
          {pageCount > 1 ? (
            <p className="text-xs font-medium uppercase tracking-wider text-white/45">
              Page {pageIndex + 1} / {pageCount}
              <span className="ml-2 font-normal normal-case tracking-normal text-white/35">
                · advances every 30s
              </span>
            </p>
          ) : null}
        </div>
      </header>

      <div className="relative mt-3 min-h-0 flex-1 overflow-hidden sm:mt-4">
        {!rows.length ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-white/50">
            {emptyMessage}
          </p>
        ) : (
          <div
            key={animKey}
            className="flex h-full min-h-0 animate-in fade-in duration-500 fill-mode-both flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0a1210]"
          >
            <div
              className="grid shrink-0 grid-cols-[3rem_minmax(0,1fr)_5.5rem_4rem] items-center gap-x-3 border-b border-white/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white/45 sm:grid-cols-[3.5rem_minmax(0,1fr)_6.5rem_5rem] sm:gap-x-4 sm:px-5 sm:text-[11px] lg:grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_6.5rem_5rem]"
              role="row"
            >
              <span>#</span>
              <span>{entityLabel}</span>
              <span className="hidden lg:block">Players</span>
              <span className="text-center" title="Wins – Losses – Ties">
                W-L-T
              </span>
              <span className="text-right" title="Points">
                P
              </span>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-white/8 overflow-hidden">
              {currentPage.map((row, i) => {
                const rank = startRank + i;
                const isTop3 = rank <= 3;
                return (
                  <li
                    key={row.id}
                    className={cn(
                      "grid h-[calc(100%/var(--lb-rows,12))] min-h-[2.75rem] grid-cols-[3rem_minmax(0,1fr)_5.5rem_4rem] items-center gap-x-3 px-3 py-1.5 sm:grid-cols-[3.5rem_minmax(0,1fr)_6.5rem_5rem] sm:gap-x-4 sm:px-5 lg:grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_6.5rem_5rem]",
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
                        "font-mono text-sm font-bold tabular-nums sm:text-base",
                        isTop3
                          ? "text-[color:var(--display-primary,#3dba96)]"
                          : "text-white/40",
                      )}
                    >
                      {rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white sm:text-base">
                        {row.name}
                      </p>
                      {row.subtitle ? (
                        <p className="mt-0.5 truncate text-[11px] text-white/45 lg:hidden">
                          {row.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <p className="hidden truncate text-xs text-white/45 lg:block">
                      {row.subtitle || "—"}
                    </p>
                    <span className="text-center text-sm tabular-nums text-white/70 sm:text-base">
                      {row.wins}-{row.losses}-{row.ties}
                    </span>
                    <span className="text-right text-base font-bold tabular-nums text-[color:var(--display-primary,#3dba96)] sm:text-lg">
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
        <div className="mt-2.5 flex shrink-0 items-center justify-center gap-2">
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
                "h-2 rounded-full transition-all duration-500",
                i === pageIndex ? "w-8 bg-white/80" : "w-2 bg-white/25 hover:bg-white/45",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
