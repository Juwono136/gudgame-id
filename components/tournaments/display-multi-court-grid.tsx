"use client";

import type { ReactNode } from "react";
import { GAME_RALLY_MILESTONES } from "@/lib/tournaments/scoring/game-mode";
import { cn } from "@/lib/utils";

type MultiCourtDisplayCardProps = {
  courtName: string;
  teamAName: string;
  teamBName: string;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  /** Games won (race-to-N) or flat match points. */
  scoreA: number;
  scoreB: number;
  subtitle?: string;
  /** When set, primary numbers are points this game; scoreA/B = games won. */
  gamesMode?: {
    pointsA: number;
    pointsB: number;
    raceToGames: number;
    pointsToWinGame?: number;
  };
};

export function MultiCourtDisplayCard({
  courtName,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  scoreA,
  scoreB,
  subtitle,
  gamesMode,
}: MultiCourtDisplayCardProps) {
  const milestones =
    gamesMode && (gamesMode.pointsToWinGame ?? 40) === 40
      ? GAME_RALLY_MILESTONES
      : gamesMode
        ? ([gamesMode.pointsToWinGame ?? 40] as readonly number[])
        : [];
  const lead = gamesMode ? Math.max(gamesMode.pointsA, gamesMode.pointsB) : 0;

  return (
    <article
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/15",
        "bg-white/[0.06] p-2.5 shadow-lg backdrop-blur-md sm:p-3 lg:p-4",
      )}
    >
      <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 sm:mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 sm:text-[11px]">
          {courtName}
        </p>
        <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-200 sm:text-[10px]">
          Live
        </span>
      </div>

      {subtitle ? (
        <p className="mb-1.5 line-clamp-1 shrink-0 text-[10px] uppercase tracking-wide text-white/45 sm:mb-2 sm:text-[11px]">
          {subtitle}
        </p>
      ) : null}

      {gamesMode ? (
        <div className="mb-1.5 shrink-0 space-y-1 sm:mb-2 sm:space-y-1.5">
          <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 sm:rounded-xl sm:px-3 sm:py-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/45 sm:text-[10px]">
              Race to {gamesMode.raceToGames} · Games
            </span>
            <span className="text-base font-bold tabular-nums text-white sm:text-lg">
              {scoreA}
              <span className="mx-1 font-light text-white/40">–</span>
              {scoreB}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {milestones.map((m, i) => (
              <span
                key={m}
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide sm:px-2 sm:text-[9px]",
                  lead >= m
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 text-white/40",
                )}
              >
                R{i + 1}·{m}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 content-center gap-1.5 sm:gap-2 lg:gap-3">
        <ScoreRow
          name={teamAName}
          players={teamAPlayers}
          score={gamesMode ? gamesMode.pointsA : scoreA}
        />
        <div className="h-px shrink-0 bg-white/10" />
        <ScoreRow
          name={teamBName}
          players={teamBPlayers}
          score={gamesMode ? gamesMode.pointsB : scoreB}
        />
      </div>

      {gamesMode ? (
        <p className="mt-1.5 shrink-0 text-center text-[9px] uppercase tracking-wider text-white/40 sm:mt-2 sm:text-[10px]">
          Points this game (+1 each)
        </p>
      ) : null}
    </article>
  );
}

function ScoreRow({
  name,
  players,
  score,
}: {
  name: string;
  players?: string[];
  score: number;
}) {
  return (
    <div className="flex min-h-0 items-center justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug text-white/90 sm:text-base lg:text-lg">
          {name}
        </p>
        {players?.length ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-white/50 sm:text-[11px]">
            {players.join(" · ")}
          </p>
        ) : null}
      </div>
      <p
        className={cn(
          "shrink-0 font-bold tabular-nums text-white",
          "text-[clamp(1.75rem,5.5vh,3.25rem)]",
        )}
      >
        {score}
      </p>
    </div>
  );
}

export function MultiCourtWaitingCard({ courtName }: { courtName: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-2xl",
        "border border-dashed border-white/15 bg-white/[0.04] p-4 text-center sm:p-6",
      )}
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-white/60">{courtName}</p>
      <p className="mt-2 text-xs text-white/40">Waiting for match</p>
    </div>
  );
}

function resolveGridTemplate(courtCount: number): {
  columns: number;
  rows: number;
} {
  if (courtCount <= 1) return { columns: 1, rows: 1 };
  if (courtCount === 2) return { columns: 2, rows: 1 };
  if (courtCount === 3) return { columns: 3, rows: 1 };
  return { columns: 2, rows: 2 };
}

/** Max courts shown per multi-court display slide (auto-paginates beyond this). */
export const MULTI_COURT_PER_SLIDE = 4;
export const MULTI_COURT_SLIDE_INTERVAL_MS = 30_000;

export function MultiCourtDisplayGrid({
  tournamentName,
  children,
  className,
  courtCount = 1,
  slideIndex,
  slideCount,
}: {
  tournamentName: string;
  children: ReactNode;
  className?: string;
  courtCount?: number;
  /** 0-based slide index when courts are paginated. */
  slideIndex?: number;
  slideCount?: number;
}) {
  const { columns, rows } = resolveGridTemplate(Math.max(1, Math.min(courtCount, MULTI_COURT_PER_SLIDE)));
  const showSlideHint = slideCount != null && slideCount > 1 && slideIndex != null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        /* Leave room for fixed Refresh / Fullscreen / Exit controls */
        "px-2.5 pb-[4.25rem] pt-2.5 sm:px-4 sm:pb-[4.5rem] sm:pt-3 lg:px-5",
        className,
      )}
    >
      <div className="mb-1.5 shrink-0 sm:mb-2.5">
        <h1
          className={cn(
            "text-center font-bold leading-tight text-white",
            "text-[clamp(0.95rem,2.4vh,1.75rem)]",
          )}
        >
          {tournamentName}
        </h1>
        {showSlideHint ? (
          <div className="mt-1.5 flex flex-col items-center gap-1.5 sm:mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:text-[11px]">
              Courts {(slideIndex! * MULTI_COURT_PER_SLIDE) + 1}
              –
              {Math.min((slideIndex! + 1) * MULTI_COURT_PER_SLIDE, slideIndex! * MULTI_COURT_PER_SLIDE + courtCount)}
              {" · "}
              Slide {slideIndex! + 1}/{slideCount}
            </p>
            <div className="flex items-center gap-1.5" aria-hidden>
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
          </div>
        ) : null}
      </div>

      <div
        className="grid min-h-0 flex-1 gap-1.5 sm:gap-2.5 lg:gap-3"
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
