"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GAME_RALLY_MILESTONES,
  countCompletedRallies,
  formatRaceToGamesLabel,
  nextRallyTarget,
  type MatchGameRules,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";
import { cn } from "@/lib/utils";

type GameRaceScoreboardProps = {
  teamAName: string;
  teamBName: string;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  gamesA: number;
  gamesB: number;
  gameState: MatchGameState;
  rules: MatchGameRules;
  disabled?: boolean;
  /** True while a score write is in flight / queued — buttons stay clickable (queued). */
  syncing?: boolean;
  onPointA: (delta: 1 | -1) => void;
  onPointB: (delta: 1 | -1) => void;
  /** After a game is won (points held), continue to the next game at 0–0. */
  onNextGame?: () => void;
  className?: string;
  /** Hide internal team headers when the parent already shows teams. */
  hideTeamHeaders?: boolean;
};

/**
 * Race-to-N live scoreboard — sequential +1 points (0…40), not tennis jumps.
 * First to pointsToWinGame (40) wins 1 game toward Race to N.
 * Winning score stays on screen until the operator taps “Next game”.
 */
export function GameRaceScoreboard({
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  gamesA,
  gamesB,
  gameState,
  rules,
  disabled,
  syncing = false,
  onPointA,
  onPointB,
  onNextGame,
  className,
  hideTeamHeaders = false,
}: GameRaceScoreboardProps) {
  const matchComplete = Math.max(gamesA, gamesB) >= rules.raceToGames;
  const pointsA = gameState.currentPointsA;
  const pointsB = gameState.currentPointsB;
  const pendingWinner = gameState.pendingGameWinner ?? null;
  const gameHeld = Boolean(pendingWinner);
  const canInc = !disabled && !matchComplete && !gameHeld;
  const canDecA =
    !disabled && pointsA > 0 && (!gameHeld || pendingWinner === "a");
  const canDecB =
    !disabled && pointsB > 0 && (!gameHeld || pendingWinner === "b");
  const milestones =
    rules.pointsToWinGame === 40
      ? GAME_RALLY_MILESTONES
      : ([rules.pointsToWinGame] as readonly number[]);
  const winnerName =
    pendingWinner === "a" ? teamAName : pendingWinner === "b" ? teamBName : null;

  return (
    <div className={cn("w-full min-w-0 space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cp-border/80 bg-cp-elevated/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            Match · {formatRaceToGamesLabel(rules.raceToGames)}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {gamesA}
            <span className="mx-1.5 font-normal text-cp-muted">–</span>
            {gamesB}
            <span className="ml-2 text-xs font-medium text-cp-muted">games won</span>
          </p>
        </div>
        <p
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            syncing
              ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : matchComplete
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : gameHeld
                  ? "border-cp-primary/40 bg-cp-primary/10 text-cp-primary"
                  : "border-cp-border/70 bg-cp-card text-cp-muted",
          )}
        >
          {syncing
            ? "Saving…"
            : matchComplete
              ? "Match complete"
              : gameHeld
                ? "Game won"
                : "In play"}
        </p>
      </div>

      <div className="rounded-2xl border border-cp-border bg-cp-elevated/25 p-3 sm:p-4">
        <div className="mb-3 flex flex-col items-center gap-1.5 sm:mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cp-primary">
            Points this game
          </p>
          <RallyMilestoneTrack
            pointsA={pointsA}
            pointsB={pointsB}
            milestones={milestones}
            target={rules.pointsToWinGame}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-3">
          <SideScorePanel
            name={teamAName}
            players={teamAPlayers}
            points={pointsA}
            milestones={milestones}
            incrementDisabled={!canInc}
            onIncrement={() => onPointA(1)}
            onDecrement={() => onPointA(-1)}
            canDecrement={canDecA}
            hideHeader={hideTeamHeaders}
            highlight={pendingWinner === "a"}
          />

          <div className="hidden items-center justify-center sm:flex">
            <span className="text-2xl font-light text-cp-muted">:</span>
          </div>

          <SideScorePanel
            name={teamBName}
            players={teamBPlayers}
            points={pointsB}
            milestones={milestones}
            incrementDisabled={!canInc}
            onIncrement={() => onPointB(1)}
            onDecrement={() => onPointB(-1)}
            canDecrement={canDecB}
            hideHeader={hideTeamHeaders}
            align="right"
            highlight={pendingWinner === "b"}
          />
        </div>

        {gameHeld && winnerName ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-cp-primary/30 bg-cp-primary/5 px-3 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">
              {winnerName} won this game ({pointsA}–{pointsB})
            </p>
            {matchComplete ? (
              <p className="text-xs text-cp-muted">
                Race to {rules.raceToGames} reached — finalize the match when ready.
              </p>
            ) : (
              <Button
                type="button"
                className="w-full max-w-xs touch-manipulation sm:w-auto"
                disabled={disabled || syncing || !onNextGame}
                onClick={onNextGame}
              >
                Next game · reset to 0–0
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-cp-muted">
        Each <span className="font-medium text-foreground">+</span> adds{" "}
        <span className="font-medium text-foreground">1 point</span>
        {" · "}
        Reach {milestones.join(" → ")} to win a game
        {" · "}
        First to {rules.raceToGames} games wins
      </p>
    </div>
  );
}

function RallyMilestoneTrack({
  pointsA,
  pointsB,
  milestones,
  target,
}: {
  pointsA: number;
  pointsB: number;
  milestones: readonly number[];
  target: number;
}) {
  const lead = Math.max(pointsA, pointsB);
  return (
    <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-1.5">
      {milestones.map((m, i) => {
        const reached = lead >= m;
        return (
          <span
            key={m}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
              reached
                ? "border-cp-primary/40 bg-cp-primary/15 text-cp-primary"
                : "border-cp-border/70 bg-cp-card text-cp-muted",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                reached ? "bg-cp-primary" : "bg-cp-muted/50",
              )}
            />
            Rally {i + 1} · {m}
            {m === target ? "" : ""}
          </span>
        );
      })}
    </div>
  );
}

function SideScorePanel({
  name,
  players,
  points,
  milestones,
  incrementDisabled,
  onIncrement,
  onDecrement,
  canDecrement,
  hideHeader,
  align = "left",
  highlight = false,
}: {
  name: string;
  players?: string[];
  points: number;
  milestones: readonly number[];
  incrementDisabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  canDecrement: boolean;
  hideHeader?: boolean;
  align?: "left" | "right";
  highlight?: boolean;
}) {
  const ralliesDone = countCompletedRallies(points, milestones);
  const next = nextRallyTarget(points, milestones);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border bg-cp-card/60 p-3",
        highlight ? "border-cp-primary/50 ring-1 ring-cp-primary/25" : "border-cp-border/60",
        align === "right" && "sm:items-end",
      )}
    >
      {!hideHeader ? (
        <div className={cn("min-w-0", align === "right" && "sm:text-right")}>
          <p className="truncate text-sm font-semibold text-foreground" title={name}>
            {name}
          </p>
          {players?.length ? (
            <p
              className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-cp-muted"
              title={players.join(", ")}
            >
              {players.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={cn("flex items-center justify-center gap-2", align === "right" && "sm:justify-end")}>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 touch-manipulation rounded-full border-cp-border sm:h-9 sm:w-9"
          disabled={!canDecrement}
          onClick={onDecrement}
          aria-label={`Remove 1 point from ${name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[3.25rem] text-center text-4xl font-bold tabular-nums text-foreground sm:min-w-[3.5rem] sm:text-5xl">
          {points}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 touch-manipulation rounded-full border-cp-border sm:h-9 sm:w-9"
          disabled={incrementDisabled}
          onClick={onIncrement}
          aria-label={`Add 1 point to ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <p
        className={cn(
          "text-center text-[11px] text-cp-muted",
          align === "right" && "sm:text-right",
        )}
      >
        {next != null ? (
          <>
            Rally {ralliesDone + 1} · {points}/{next}
          </>
        ) : (
          <>Game point reached</>
        )}
      </p>
    </div>
  );
}

/** Compact read-only badge: games won on one line, label on the next. */
export function GameRaceScoreBadge({
  gamesA,
  gamesB,
  currentPointsA,
  currentPointsB,
  showRally = false,
  className,
}: {
  gamesA: number;
  gamesB: number;
  currentPointsA?: number;
  currentPointsB?: number;
  /** @deprecated Tennis labels removed — kept for call-site compat. */
  pointStyle?: "tennis" | "simple";
  showRally?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <span className="inline-flex min-w-[4.5rem] flex-col items-center justify-center rounded-xl bg-cp-primary/10 px-3 py-1.5 text-foreground">
        <span className="text-sm font-bold tabular-nums leading-none sm:text-base">
          {gamesA}
          <span className="mx-1 font-normal text-cp-muted">–</span>
          {gamesB}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
          Games
        </span>
      </span>
      {showRally && currentPointsA != null && currentPointsB != null ? (
        <span className="text-[11px] tabular-nums text-cp-muted">
          Points {currentPointsA}–{currentPointsB}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Full-screen venue display for race-to-N: large sequential points + games won.
 */
export function LiveGameRaceDisplay({
  teamAName,
  teamBName,
  gamesA,
  gamesB,
  pointsA,
  pointsB,
  raceToGames,
  pointsToWinGame = 40,
  subtitle,
  className,
}: {
  teamAName: string;
  teamBName: string;
  gamesA: number;
  gamesB: number;
  pointsA: number;
  pointsB: number;
  raceToGames: number;
  pointsToWinGame?: number;
  /** @deprecated Unused — sequential points only. */
  pointStyle?: "tennis" | "simple";
  subtitle?: string;
  className?: string;
}) {
  const milestones =
    pointsToWinGame === 40
      ? GAME_RALLY_MILESTONES
      : ([pointsToWinGame] as readonly number[]);
  const lead = Math.max(pointsA, pointsB);

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-white",
        className,
      )}
    >
      {subtitle ? (
        <p className="mb-4 text-center text-sm uppercase tracking-[0.2em] text-white/60 sm:text-base">
          {subtitle}
        </p>
      ) : null}

      <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-center backdrop-blur-sm sm:mb-8 sm:px-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
          {formatRaceToGamesLabel(raceToGames)} · Games won
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums sm:text-5xl">
          {gamesA}
          <span className="mx-3 font-light text-white/40">–</span>
          {gamesB}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
        {milestones.map((m, i) => (
          <span
            key={m}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
              lead >= m
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/15 text-white/45",
            )}
          >
            Rally {i + 1} · {m}
          </span>
        ))}
      </div>

      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
        Points this game
      </p>

      <div className="grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <div className="min-w-0 text-center">
          <p className="mb-3 line-clamp-2 break-words text-lg font-medium text-white/80 sm:text-2xl">
            {teamAName}
          </p>
          <p className="text-7xl font-bold tabular-nums sm:text-8xl md:text-9xl">{pointsA}</p>
        </div>
        <span className="text-4xl font-light text-white/40 sm:text-6xl">:</span>
        <div className="min-w-0 text-center">
          <p className="mb-3 line-clamp-2 break-words text-lg font-medium text-white/80 sm:text-2xl">
            {teamBName}
          </p>
          <p className="text-7xl font-bold tabular-nums sm:text-8xl md:text-9xl">{pointsB}</p>
        </div>
      </div>
    </div>
  );
}
