"use client";

import type { ReactNode } from "react";
import { LiveMatchTimer } from "@/components/tournaments/live/live-match-timer";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import { cn } from "@/lib/utils";

type MultiCourtDisplayCardProps = {
  courtName: string;
  teamAName: string;
  teamBName: string;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  /** Games won (race-to-N / total-N) or flat match points. */
  scoreA: number;
  scoreB: number;
  startedAt?: string | null;
  timerEndsAt?: string | null;
  estimatedDurationMinutes?: number | null;
  matchActive?: boolean;
  /** When set, center shows games + large points this game (public live style). */
  gamesMode?: {
    pointsA: number;
    pointsB: number;
    raceToGames: number;
    pointsToWinGame?: number;
    lengthMode?: "race_to" | "total";
  };
};

/**
 * TV multi-court card — same schema as public Live Score court cards
 * (team | score | team + LiveMatchTimer + rules line), styled for venue monitors.
 */
export function MultiCourtDisplayCard({
  courtName,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  scoreA,
  scoreB,
  startedAt = null,
  timerEndsAt = null,
  estimatedDurationMinutes = null,
  matchActive = true,
  gamesMode,
}: MultiCourtDisplayCardProps) {
  return (
    <article
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-500/30",
        "bg-[#0c1613] p-3 shadow-lg sm:p-3.5 lg:p-4",
      )}
    >
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80 sm:text-[11px]">
          {courtName}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          Live
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3">
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-white sm:text-base" title={teamAName}>
            {teamAName}
          </p>
          <TeamPlayerList
            names={teamAPlayers}
            maxNames={3}
            compact
            className="[&_li]:text-white/50 [&_svg]:text-white/35"
          />
        </div>

        <div className="flex min-w-[4rem] flex-col items-center justify-center px-1 sm:min-w-[5rem]">
          {gamesMode ? (
            <>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">
                Games
              </p>
              <p className="text-base font-bold tabular-nums text-white sm:text-lg">
                {scoreA}
                <span className="mx-1 font-normal text-white/40">–</span>
                {scoreB}
              </p>
              <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300/90">
                Points
              </p>
              <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {gamesMode.pointsA}
                <span className="mx-1.5 font-light text-white/35">:</span>
                {gamesMode.pointsB}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {scoreA}
              <span className="mx-1.5 font-light text-white/35">:</span>
              {scoreB}
            </p>
          )}
        </div>

        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold text-white sm:text-base" title={teamBName}>
            {teamBName}
          </p>
          <TeamPlayerList
            names={teamBPlayers}
            maxNames={3}
            align="right"
            compact
            className="[&_li]:text-white/50 [&_svg]:text-white/35"
          />
        </div>
      </div>

      <div className="mt-2.5 shrink-0 sm:mt-3">
        <LiveMatchTimer
          startedAt={startedAt}
          timerEndsAt={timerEndsAt}
          estimatedDurationMinutes={timerEndsAt ? null : estimatedDurationMinutes}
          active={matchActive}
          tone="display"
        />
      </div>

      {gamesMode ? (
        <p className="mt-2 shrink-0 text-center text-[9px] text-white/40 sm:text-[10px]">
          {(gamesMode.lengthMode ?? "race_to") === "total"
            ? `Total ${gamesMode.raceToGames}`
            : `Race to ${gamesMode.raceToGames}`}{" "}
          · first to {gamesMode.pointsToWinGame ?? 40} pts
        </p>
      ) : null}
    </article>
  );
}

/**
 * Grid template for 1–6 live cards per page.
 * Prefer 2-row layouts when ≥4 so cards stay readable on TV.
 */
function resolveGridTemplate(courtCount: number): {
  columns: number;
  rows: number;
} {
  const n = Math.max(1, Math.min(courtCount, 6));
  if (n === 1) return { columns: 1, rows: 1 };
  if (n === 2) return { columns: 2, rows: 1 };
  if (n === 3) return { columns: 3, rows: 1 };
  if (n === 4) return { columns: 2, rows: 2 };
  if (n === 5) return { columns: 3, rows: 2 };
  return { columns: 3, rows: 2 };
}

/** Max live courts shown per multi-court display slide. */
export const MULTI_COURT_PER_SLIDE = 6;
export const MULTI_COURT_SLIDE_INTERVAL_MS = 30_000;

export function MultiCourtDisplayGrid({
  tournamentName,
  children,
  className,
  courtCount = 1,
  slideIndex,
  slideCount,
  liveCount,
}: {
  tournamentName: string;
  children: ReactNode;
  className?: string;
  courtCount?: number;
  slideIndex?: number;
  slideCount?: number;
  liveCount?: number;
}) {
  const { columns, rows } = resolveGridTemplate(
    Math.max(1, Math.min(courtCount, MULTI_COURT_PER_SLIDE)),
  );
  const showSlideHint = slideCount != null && slideCount > 1 && slideIndex != null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-3 lg:px-6",
        className,
      )}
    >
      <div className="mb-2 shrink-0 sm:mb-2.5">
        <h1
          className={cn(
            "text-center font-bold leading-tight text-white",
            "text-[clamp(0.95rem,2.4vh,1.65rem)]",
          )}
        >
          {tournamentName}
        </h1>
        <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80 sm:text-[11px]">
          {liveCount != null ? `${liveCount} court${liveCount === 1 ? "" : "s"} live` : "Live courts"}
          {showSlideHint ? ` · Slide ${slideIndex! + 1}/${slideCount}` : null}
        </p>
        {showSlideHint ? (
          <div className="mt-1.5 flex items-center justify-center gap-1.5" aria-hidden>
            {Array.from({ length: slideCount! }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === slideIndex ? "w-4 bg-emerald-400/80" : "w-1.5 bg-white/25",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="grid min-h-0 flex-1 gap-2 sm:gap-2.5 lg:gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
