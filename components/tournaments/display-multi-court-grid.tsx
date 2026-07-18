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
    <article className="flex min-h-[180px] min-w-0 flex-col rounded-2xl border border-white/15 bg-white/[0.06] p-4 shadow-lg backdrop-blur-md sm:min-h-[200px] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          {courtName}
        </p>
        <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200">
          Live
        </span>
      </div>

      {subtitle ? (
        <p className="mb-3 line-clamp-2 text-[11px] uppercase tracking-wide text-white/45">{subtitle}</p>
      ) : null}

      {gamesMode ? (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Race to {gamesMode.raceToGames} · Games
            </span>
            <span className="text-lg font-bold tabular-nums text-white">
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
                  "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
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

      <div className="grid flex-1 gap-3">
        <ScoreRow
          name={teamAName}
          players={teamAPlayers}
          score={gamesMode ? gamesMode.pointsA : scoreA}
        />
        <div className="h-px bg-white/10" />
        <ScoreRow
          name={teamBName}
          players={teamBPlayers}
          score={gamesMode ? gamesMode.pointsB : scoreB}
        />
      </div>

      {gamesMode ? (
        <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-white/40">
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
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-snug text-white/90 sm:text-base">
          {name}
        </p>
        {players?.length ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/50">
            {players.join(" · ")}
          </p>
        ) : null}
      </div>
      <p className="shrink-0 text-4xl font-bold tabular-nums text-white sm:text-5xl">{score}</p>
    </div>
  );
}

export function MultiCourtDisplayGrid({
  tournamentName,
  children,
  className,
  courtCount = 1,
}: {
  tournamentName: string;
  children: ReactNode;
  className?: string;
  courtCount?: number;
}) {
  const gridClass =
    courtCount <= 1
      ? "mx-auto grid max-w-xl auto-rows-fr gap-4"
      : courtCount === 2
        ? "mx-auto grid max-w-5xl auto-rows-fr gap-4 sm:grid-cols-2"
        : courtCount <= 4
          ? "grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:max-w-6xl xl:mx-auto"
          : "grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4";

  return (
    <div className={cn("flex min-h-dvh flex-col justify-center", className)}>
      <h1 className="mb-4 text-center text-xl font-bold text-white sm:mb-6 sm:text-2xl lg:text-3xl">
        {tournamentName}
      </h1>
      <div className={gridClass}>{children}</div>
    </div>
  );
}
