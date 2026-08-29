"use client";

import type { ReactNode } from "react";
import { LiveMatchTimer } from "@/components/tournaments/live/live-match-timer";
import { DisplayLeadingCrown } from "@/components/tournaments/display/display-leading-crown";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import {
  GAME_RALLY_MILESTONES,
  formatRallyDisplayPoint,
} from "@/lib/tournaments/scoring/game-mode";
import { cn } from "@/lib/utils";

type MultiCourtDisplayCardProps = {
  courtName: string;
  teamAName: string;
  teamBName: string;
  teamAPlayers?: Array<
    string | { displayName?: string | null; name?: string | null; image?: string | null }
  >;
  teamBPlayers?: Array<
    string | { displayName?: string | null; name?: string | null; image?: string | null }
  >;
  /** Games won (race-to-N / total-N) or flat match points. */
  scoreA: number;
  scoreB: number;
  startedAt?: string | null;
  timerEndsAt?: string | null;
  estimatedDurationMinutes?: number | null;
  matchActive?: boolean;
  scorekeeperName?: string | null;
  /** When set, center shows games + large points this game (public live style). */
  gamesMode?: {
    pointsA: number;
    pointsB: number;
    raceToGames: number;
    pointsToWinGame?: number;
    lengthMode?: "race_to" | "total";
    classicSets?: boolean;
    gameDecider?: "golden_point" | "star_point" | "advantage";
  };
};

/**
 * TV multi-court card — same schema as public Live Score court cards
 * (team | score | team + LiveMatchTimer + rules line), styled for venue monitors.
 * Uses `--display-primary` / `--display-accent` from DisplayVenueShell when set.
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
  scorekeeperName = null,
  gamesMode,
}: MultiCourtDisplayCardProps) {
  const gamesLeadA = scoreA > scoreB;
  const gamesLeadB = scoreB > scoreA;
  const pointsLeadA = gamesMode ? gamesMode.pointsA > gamesMode.pointsB : false;
  const pointsLeadB = gamesMode ? gamesMode.pointsB > gamesMode.pointsA : false;

  return (
    <article
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border shadow-lg",
        "bg-[#0c1613]",
      )}
      style={{
        borderColor: "color-mix(in srgb, var(--display-primary, #10b981) 35%, transparent)",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-3.5 lg:p-4">
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p
            className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]"
            style={{ color: "color-mix(in srgb, var(--display-primary, #6ee7b7) 85%, white)" }}
          >
            {courtName}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            Live
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-bold text-white sm:text-base" title={teamAName}>
              {teamAName}
            </p>
            <TeamPlayerList
              names={teamAPlayers}
              maxNames={3}
              compact
              variant="avatar"
              tone="display"
            />
          </div>

          <div className="flex min-w-[4.5rem] flex-col items-center justify-center px-1 sm:min-w-[5.5rem]">
            {gamesMode ? (
              <>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">
                  {gamesMode.classicSets ? "Sets" : "Games"}
                </p>
                <p className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums text-white sm:text-xl">
                  <DisplayLeadingCrown show={gamesLeadA} size="sm" />
                  <span className={gamesLeadA ? "text-[color:var(--display-primary,#86efac)]" : ""}>
                    {scoreA}
                  </span>
                  <span className="mx-0.5 font-normal text-white/40">–</span>
                  <span className={gamesLeadB ? "text-[color:var(--display-primary,#86efac)]" : ""}>
                    {scoreB}
                  </span>
                  <DisplayLeadingCrown show={gamesLeadB} size="sm" />
                </p>
                <p
                  className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    color: "color-mix(in srgb, var(--display-primary, #6ee7b7) 90%, white)",
                  }}
                >
                  Points
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                  {(gamesMode.pointsToWinGame === 40
                    ? GAME_RALLY_MILESTONES
                    : [gamesMode.pointsToWinGame ?? 40]
                  ).map((m) => {
                    const reachedA = gamesMode.pointsA >= m;
                    const reachedB = gamesMode.pointsB >= m;
                    return (
                      <span
                        key={m}
                        className={cn(
                          "rounded-full border px-1.5 py-px text-[8px] font-semibold tabular-nums",
                          reachedA || reachedB
                            ? "border-white/30 text-white/85"
                            : "border-white/10 text-white/35",
                        )}
                      >
                        {formatRallyDisplayPoint(m, gamesMode.pointsToWinGame ?? 40)}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-1.5 flex items-center justify-center gap-1 text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  <DisplayLeadingCrown show={pointsLeadA} size="md" />
                  <span className={pointsLeadA ? "text-[color:var(--display-primary,#86efac)]" : ""}>
                    {formatRallyDisplayPoint(gamesMode.pointsA, gamesMode.pointsToWinGame ?? 40)}
                  </span>
                  <span className="mx-1 font-light text-white/35">:</span>
                  <span className={pointsLeadB ? "text-[color:var(--display-primary,#86efac)]" : ""}>
                    {formatRallyDisplayPoint(gamesMode.pointsB, gamesMode.pointsToWinGame ?? 40)}
                  </span>
                  <DisplayLeadingCrown show={pointsLeadB} size="md" />
                </p>
              </>
            ) : (
              <p className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums text-white sm:text-3xl">
                <DisplayLeadingCrown show={scoreA > scoreB} size="md" />
                <span className={scoreA > scoreB ? "text-[color:var(--display-primary,#86efac)]" : ""}>
                  {scoreA}
                </span>
                <span className="mx-1 font-light text-white/35">:</span>
                <span className={scoreB > scoreA ? "text-[color:var(--display-primary,#86efac)]" : ""}>
                  {scoreB}
                </span>
                <DisplayLeadingCrown show={scoreB > scoreA} size="md" />
              </p>
            )}
          </div>

          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-bold text-white sm:text-base" title={teamBName}>
              {teamBName}
            </p>
            <TeamPlayerList
              names={teamBPlayers}
              maxNames={3}
              align="right"
              compact
              variant="avatar"
              tone="display"
            />
          </div>
        </div>

        {gamesMode ? (
          <p className="mt-2 shrink-0 text-center text-[9px] text-white/40 sm:text-[10px]">
            {gamesMode.classicSets
              ? `Classic sets · first to ${gamesMode.pointsToWinGame ?? 40} pts`
              : (gamesMode.lengthMode ?? "race_to") === "total"
                ? `Total ${gamesMode.raceToGames} · first to ${gamesMode.pointsToWinGame ?? 40} pts`
                : `Race to ${gamesMode.raceToGames} · first to ${gamesMode.pointsToWinGame ?? 40} pts`}
          </p>
        ) : null}
      </div>

      <footer className="grid shrink-0 grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-black/25 text-center">
        <div className="px-2 py-2">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-white/40 sm:text-[9px]">
            Court
          </p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-white sm:text-[11px]">
            {courtName}
          </p>
        </div>
        <div className="px-2 py-2">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-white/40 sm:text-[9px]">
            Scorekeeper
          </p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-white sm:text-[11px]">
            {scorekeeperName?.trim() || "—"}
          </p>
        </div>
        <div className="px-2 py-2">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-white/40 sm:text-[9px]">
            Duration
          </p>
          <div className="mt-0.5 flex justify-center">
            <LiveMatchTimer
              startedAt={startedAt}
              timerEndsAt={timerEndsAt}
              estimatedDurationMinutes={timerEndsAt ? null : estimatedDurationMinutes}
              active={matchActive}
              tone="display"
              compact
            />
          </div>
        </div>
      </footer>
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
