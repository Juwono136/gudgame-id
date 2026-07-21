"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

export type DisplayLeaderboardRow = {
  id: string;
  name: string;
  subtitle?: string;
  stats: string;
};

const PAGE_INTERVAL_MS = 30_000;
const ROW_HEIGHT_ESTIMATE = 72;
const HEADER_RESERVE = 120;
const FOOTER_RESERVE = 72;

type DisplaySessionLeaderboardProps = {
  tournamentName: string;
  title?: string;
  rows: DisplayLeaderboardRow[];
  className?: string;
  emptyMessage?: string;
};

function usePageCapacity(containerRef: RefObject<HTMLElement | null>) {
  const [capacity, setCapacity] = useState({ columns: 2, rowsPerCol: 8 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      const columns = width < 640 ? 1 : 2;
      const available = Math.max(240, height - HEADER_RESERVE - FOOTER_RESERVE);
      const rowsPerCol = Math.max(4, Math.floor(available / ROW_HEIGHT_ESTIMATE));
      setCapacity({ columns, rowsPerCol });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return capacity;
}

export function DisplaySessionLeaderboard({
  tournamentName,
  title = "Session leaderboard",
  rows,
  className,
  emptyMessage = "Standings appear after the first match is scored.",
}: DisplaySessionLeaderboardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { columns, rowsPerCol } = usePageCapacity(rootRef);
  const pageSize = Math.max(1, columns * rowsPerCol);

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
  const leftCol = currentPage.filter((_, i) => i % columns === 0);
  const rightCol = columns > 1 ? currentPage.filter((_, i) => i % columns === 1) : [];

  return (
    <div
      ref={rootRef}
      className={cn("flex h-dvh min-h-dvh flex-col p-4 sm:p-6 lg:p-8", className)}
    >
      <header className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {tournamentName}
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/60 sm:text-base">{title}</p>
          {pageCount > 1 ? (
            <p className="text-xs font-medium uppercase tracking-wider text-white/45">
              Page {pageIndex + 1} / {pageCount}
              <span className="ml-2 font-normal normal-case tracking-normal text-white/35">
                · auto-advances every 30s
              </span>
            </p>
          ) : null}
        </div>
      </header>

      <div className="relative mt-4 min-h-0 flex-1 sm:mt-6">
        {!rows.length ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-white/50">
            {emptyMessage}
          </p>
        ) : (
          <div
            key={animKey}
            className={cn(
              "grid h-full animate-in fade-in slide-in-from-right-4 gap-3 duration-700 fill-mode-both sm:gap-4",
              columns > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            <LeaderboardColumn
              entries={leftCol}
              firstRank={pageIndex * pageSize + 1}
              rankStep={columns}
            />
            {columns > 1 ? (
              <LeaderboardColumn
                entries={rightCol}
                firstRank={pageIndex * pageSize + 2}
                rankStep={columns}
              />
            ) : null}
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <div className="mt-3 flex shrink-0 items-center justify-center gap-2 pb-1">
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

function LeaderboardColumn({
  entries,
  firstRank,
  rankStep,
}: {
  entries: DisplayLeaderboardRow[];
  firstRank: number;
  rankStep: number;
}) {
  return (
    <ul className="flex min-h-0 flex-col gap-2 sm:gap-2.5">
      {entries.map((row, i) => {
        const rank = firstRank + i * rankStep;
        return (
          <li
            key={row.id}
            className="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur-sm sm:min-h-[4rem] sm:px-4 sm:py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white sm:text-base lg:text-lg">
                <span className="mr-2 font-mono text-white/40">#{rank}</span>
                {row.name}
              </p>
              {row.subtitle ? (
                <p className="mt-0.5 truncate text-[11px] text-white/45 sm:text-xs">
                  {row.subtitle}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 font-mono text-sm tabular-nums text-white sm:text-base lg:text-lg">
              {row.stats}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
