"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GAME_RALLY_MILESTONES,
  formatRaceToGamesLabel,
  serveHistoryFromCompletedGames,
  type MatchGameRules,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";
import type { ScoreAdjustOptions } from "@/lib/tournaments/scoring/match-score-events";
import { cn } from "@/lib/utils";

export type GameRaceRosterPlayer = {
  userId: string;
  displayName: string;
};

type GameRaceScoreboardProps = {
  teamAName: string;
  teamBName: string;
  /** Display-only player names (legacy). Prefer rosterA/rosterB for server selection. */
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  rosterA?: GameRaceRosterPlayer[];
  rosterB?: GameRaceRosterPlayer[];
  gamesA: number;
  gamesB: number;
  gameState: MatchGameState;
  rules: MatchGameRules;
  disabled?: boolean;
  /** True while a score write is in flight / queued — buttons stay clickable (queued). */
  syncing?: boolean;
  onPointA: (delta: 1 | -1, server?: ScoreAdjustOptions) => void;
  onPointB: (delta: 1 | -1, server?: ScoreAdjustOptions) => void;
  /** Jump selected side points to an absolute milestone (15 / 30 / 40). */
  onSetPointsA?: (target: number, server?: ScoreAdjustOptions) => void;
  onSetPointsB?: (target: number, server?: ScoreAdjustOptions) => void;
  /** After a game is won (points held), continue to the next game at 0–0. */
  onNextGame?: (server?: ScoreAdjustOptions) => void;
  className?: string;
  /** Hide internal team headers when the parent already shows teams. */
  hideTeamHeaders?: boolean;
  /**
   * ITF/FIP classic sets: `gamesA`/`gamesB` are sets won; games-in-set and TB
   * come from gameState.
   */
  classicSets?: boolean;
  /** Sets needed to win the match (best of 3 → 2). */
  setsToWin?: number;
};

/**
 * Race-to-N live scoreboard — ±1 points plus optional jump-to milestones (15/30/40).
 * First to pointsToWinGame (40) wins 1 game toward Race to N.
 * Winning score stays on screen until the operator taps “Next game”.
 */
export function GameRaceScoreboard({
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  rosterA,
  rosterB,
  gamesA,
  gamesB,
  gameState,
  rules,
  disabled,
  syncing = false,
  onPointA,
  onPointB,
  onSetPointsA,
  onSetPointsB,
  onNextGame,
  className,
  hideTeamHeaders = false,
  classicSets = false,
  setsToWin,
}: GameRaceScoreboardProps) {
  const needSets = setsToWin ?? Math.max(1, Math.ceil((rules.raceToGames || 2)));
  const matchComplete = classicSets
    ? Math.max(gamesA, gamesB) >= needSets
    : Math.max(gamesA, gamesB) >= rules.raceToGames;
  const phase = gameState.phase ?? "game";
  const inTiebreak =
    classicSets && (phase === "set_tiebreak" || phase === "super_tiebreak");
  const pointsA = inTiebreak
    ? (gameState.tbPointsA ?? 0)
    : gameState.currentPointsA;
  const pointsB = inTiebreak
    ? (gameState.tbPointsB ?? 0)
    : gameState.currentPointsB;
  const gamesInSetA = gameState.gamesInSetA ?? 0;
  const gamesInSetB = gameState.gamesInSetB ?? 0;
  const pendingWinner = gameState.pendingGameWinner ?? null;
  const gameHeld = Boolean(pendingWinner);
  const canInc = !disabled && !matchComplete && !gameHeld;
  const canDecA = !disabled && pointsA > 0 && (!gameHeld || pendingWinner === "a");
  const canDecB = !disabled && pointsB > 0 && (!gameHeld || pendingWinner === "b");
  const milestones =
    inTiebreak
      ? ([] as readonly number[])
      : rules.pointsToWinGame === 40
        ? GAME_RALLY_MILESTONES
        : ([rules.pointsToWinGame] as readonly number[]);
  const winnerName =
    pendingWinner === "a" ? teamAName : pendingWinner === "b" ? teamBName : null;

  const headerLabel = classicSets
    ? inTiebreak
      ? phase === "super_tiebreak"
        ? "Super tiebreak"
        : "Set tiebreak"
      : "Classic sets · ITF/FIP"
    : `Match · ${formatRaceToGamesLabel(rules.raceToGames)}`;

  const scoreUnitLabel = classicSets ? "sets" : "games won";
  const pointsSectionLabel = inTiebreak
    ? phase === "super_tiebreak"
      ? "Super TB points"
      : "Tiebreak points"
    : "Points this game";
  const heldLabel = classicSets
    ? inTiebreak
      ? "Tiebreak won"
      : "Game won"
    : "Game won";
  const nextLabel = classicSets
    ? matchComplete
      ? null
      : inTiebreak || (gameState.gamesInSetA === 6 && gameState.gamesInSetB === 6)
        ? "Continue"
        : "Next game · reset points"
    : "Next game · reset to 0–0";

  const resolvedRosterA = useMemo(
    () => resolveRoster(rosterA, teamAPlayers),
    [rosterA, teamAPlayers],
  );
  const resolvedRosterB = useMemo(
    () => resolveRoster(rosterB, teamBPlayers),
    [rosterB, teamBPlayers],
  );

  const servingSide = gameState.servingSide === "b" ? "b" : "a";
  const [serverAId, setServerAId] = useState<string | null>(
    () => gameState.servingUserId && servingSide === "a"
      ? gameState.servingUserId
      : resolvedRosterA[0]?.userId ?? null,
  );
  const [serverBId, setServerBId] = useState<string | null>(
    () => gameState.servingUserId && servingSide === "b"
      ? gameState.servingUserId
      : resolvedRosterB[0]?.userId ?? null,
  );
  const [localServingSide, setLocalServingSide] = useState<"a" | "b">(servingSide);

  useEffect(() => {
    setLocalServingSide(servingSide);
  }, [servingSide, gamesA, gamesB, gameState.pendingGameWinner]);

  useEffect(() => {
    setServerAId((prev) => {
      if (
        servingSide === "a" &&
        gameState.servingUserId &&
        resolvedRosterA.some((p) => p.userId === gameState.servingUserId)
      ) {
        return gameState.servingUserId;
      }
      if (prev && resolvedRosterA.some((p) => p.userId === prev)) return prev;
      return resolvedRosterA[0]?.userId ?? null;
    });
  }, [resolvedRosterA, servingSide, gameState.servingUserId]);

  useEffect(() => {
    setServerBId((prev) => {
      if (
        servingSide === "b" &&
        gameState.servingUserId &&
        resolvedRosterB.some((p) => p.userId === gameState.servingUserId)
      ) {
        return gameState.servingUserId;
      }
      if (prev && resolvedRosterB.some((p) => p.userId === prev)) return prev;
      return resolvedRosterB[0]?.userId ?? null;
    });
  }, [resolvedRosterB, servingSide, gameState.servingUserId]);

  const activeServerOpts = serverOptionsFor(
    localServingSide === "a" ? resolvedRosterA : resolvedRosterB,
    localServingSide === "a" ? serverAId : serverBId,
    localServingSide,
  );
  const serveHistory = serveHistoryFromCompletedGames(gameState.completedGames);

  return (
    <div className={cn("w-full min-w-0 space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cp-border/80 bg-cp-elevated/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            {headerLabel}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {gamesA}
            <span className="mx-1.5 font-normal text-cp-muted">–</span>
            {gamesB}
            <span className="ml-2 text-xs font-medium text-cp-muted">{scoreUnitLabel}</span>
          </p>
          {classicSets && !inTiebreak ? (
            <p className="mt-1 text-xs tabular-nums text-cp-muted">
              Games this set{" "}
              <span className="font-semibold text-foreground">
                {gamesInSetA}–{gamesInSetB}
              </span>
            </p>
          ) : null}
          {classicSets && gameState.setScores?.length ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-cp-muted">
              Sets:{" "}
              {gameState.setScores
                .map((s) => `${s.gamesA}–${s.gamesB}`)
                .join(", ")}
            </p>
          ) : null}
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
                ? heldLabel
                : "In play"}
        </p>
      </div>

      <div className="rounded-2xl border border-cp-border bg-cp-elevated/25 p-3 sm:p-4">
        <div className="mb-3 flex flex-col items-center gap-1.5 sm:mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cp-primary">
            {pointsSectionLabel}
          </p>
          {milestones.length > 0 ? (
            <MilestoneTrack
              pointsA={pointsA}
              pointsB={pointsB}
              milestones={milestones}
            />
          ) : (
            <p className="text-sm font-bold tabular-nums text-foreground">
              {pointsA}
              <span className="mx-1 font-normal text-cp-muted">–</span>
              {pointsB}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-3">
          <SideScorePanel
            name={teamAName}
            roster={resolvedRosterA}
            selectedServerId={serverAId}
            isServingSide={localServingSide === "a"}
            onSelectServer={(userId) => {
              setServerAId(userId);
              setLocalServingSide("a");
            }}
            points={pointsA}
            milestones={milestones}
            incrementDisabled={!canInc}
            onIncrement={() => onPointA(1, activeServerOpts)}
            onDecrement={() => onPointA(-1, activeServerOpts)}
            onSetPoints={
              onSetPointsA && milestones.length > 0
                ? (target) => onSetPointsA(target, activeServerOpts)
                : undefined
            }
            canDecrement={canDecA}
            canSetPoints={canInc && milestones.length > 0}
            hideHeader={hideTeamHeaders}
            highlight={pendingWinner === "a"}
            scoringDisabled={Boolean(disabled)}
          />

          <div className="hidden items-center justify-center sm:flex">
            <span className="text-2xl font-light text-cp-muted">:</span>
          </div>

          <SideScorePanel
            name={teamBName}
            roster={resolvedRosterB}
            selectedServerId={serverBId}
            isServingSide={localServingSide === "b"}
            onSelectServer={(userId) => {
              setServerBId(userId);
              setLocalServingSide("b");
            }}
            points={pointsB}
            milestones={milestones}
            incrementDisabled={!canInc}
            onIncrement={() => onPointB(1, activeServerOpts)}
            onDecrement={() => onPointB(-1, activeServerOpts)}
            onSetPoints={
              onSetPointsB && milestones.length > 0
                ? (target) => onSetPointsB(target, activeServerOpts)
                : undefined
            }
            canDecrement={canDecB}
            canSetPoints={canInc && milestones.length > 0}
            hideHeader={hideTeamHeaders}
            highlight={pendingWinner === "b"}
            scoringDisabled={Boolean(disabled)}
          />
        </div>

        {gameHeld && winnerName ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-cp-primary/30 bg-cp-primary/5 px-3 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">
              {winnerName} won this {inTiebreak ? "tiebreak" : "game"} ({pointsA}–{pointsB})
            </p>
            {matchComplete ? (
              <p className="text-xs text-cp-muted">
                {classicSets
                  ? `First to ${needSets} sets — finish the match when ready.`
                  : `Race to ${rules.raceToGames} reached — finish the match when ready.`}
              </p>
            ) : (
              <Button
                type="button"
                className="w-full max-w-xs touch-manipulation sm:w-auto"
                disabled={disabled || syncing || !onNextGame}
                onClick={() => onNextGame?.(activeServerOpts)}
              >
                {nextLabel}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {serveHistory.length > 0 ? (
        <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            Servers this match
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {serveHistory.map((row) => (
              <li
                key={`serve-${row.gameNumber}-${row.displayName}`}
                className="rounded-full border border-cp-border/80 bg-cp-card px-2.5 py-0.5 text-[11px] text-foreground"
              >
                <span className="text-cp-muted">G{row.gameNumber}</span>
                <span className="ml-1.5 font-medium">{row.displayName}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-center text-[11px] leading-relaxed text-cp-muted">
        Tap a player to set the server · serve alternates each game ·{" "}
        <span className="font-medium text-foreground">+/−</span> for 1 point
        {milestones.length > 0 ? (
          <>
            , or jump with{" "}
            <span className="font-medium text-foreground">
              {milestones.map((m) => `+${m}`).join(" / ")}
            </span>
          </>
        ) : null}
        {" · "}
        {classicSets
          ? `First to ${needSets} sets wins`
          : `First to ${rules.raceToGames} games wins`}
      </p>
    </div>
  );
}

function resolveRoster(
  roster: GameRaceRosterPlayer[] | undefined,
  names: string[] | undefined,
): GameRaceRosterPlayer[] {
  if (roster?.length) {
    return roster.filter((p) => p.userId && p.displayName.trim());
  }
  return (names ?? [])
    .map((displayName, index) => ({
      userId: `name:${index}:${displayName}`,
      displayName,
    }))
    .filter((p) => p.displayName.trim());
}

function serverOptionsFor(
  roster: GameRaceRosterPlayer[],
  selectedId: string | null,
  servingSide: "a" | "b",
): ScoreAdjustOptions | undefined {
  const selected = roster.find((p) => p.userId === selectedId) ?? roster[0];
  if (!selected) {
    return { servingSide };
  }
  const isSynthetic = selected.userId.startsWith("name:");
  return {
    servingSide,
    serverName: selected.displayName,
    serverUserId: isSynthetic ? undefined : selected.userId,
    // Keep legacy fields populated so older audit paths still receive a name.
    scorerName: selected.displayName,
    scorerUserId: isSynthetic ? undefined : selected.userId,
  };
}

function MilestoneTrack({
  pointsA,
  pointsB,
  milestones,
}: {
  pointsA: number;
  pointsB: number;
  milestones: readonly number[];
}) {
  const lead = Math.max(pointsA, pointsB);
  return (
    <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-1.5">
      {milestones.map((m) => {
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
            {m}
          </span>
        );
      })}
    </div>
  );
}

function SideScorePanel({
  name,
  roster,
  selectedServerId,
  isServingSide,
  onSelectServer,
  points,
  milestones,
  incrementDisabled,
  onIncrement,
  onDecrement,
  onSetPoints,
  canDecrement,
  canSetPoints,
  hideHeader,
  highlight = false,
  scoringDisabled,
}: {
  name: string;
  roster: GameRaceRosterPlayer[];
  selectedServerId: string | null;
  isServingSide: boolean;
  onSelectServer: (userId: string) => void;
  points: number;
  milestones: readonly number[];
  incrementDisabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetPoints?: (target: number) => void;
  canDecrement: boolean;
  canSetPoints: boolean;
  hideHeader?: boolean;
  highlight?: boolean;
  scoringDisabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-cp-card/60 p-3",
        highlight
          ? "border-cp-primary/50 ring-1 ring-cp-primary/25"
          : isServingSide
            ? "border-cp-primary/35 ring-1 ring-cp-primary/15"
            : "border-cp-border/60",
      )}
    >
      {!hideHeader ? (
        <div className="min-w-0 w-full text-center">
          <p className="truncate text-sm font-semibold text-foreground" title={name}>
            {name}
          </p>
          {isServingSide ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-cp-primary">
              Serving
            </p>
          ) : null}
          {roster.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
              {roster.map((player) => {
                const active = isServingSide && player.userId === selectedServerId;
                return (
                  <button
                    key={player.userId}
                    type="button"
                    disabled={scoringDisabled}
                    onClick={() => onSelectServer(player.userId)}
                    className={cn(
                      "max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      active
                        ? "border-cp-primary/40 bg-cp-primary/15 text-cp-primary"
                        : "border-cp-border/70 bg-cp-elevated/30 text-cp-muted hover:text-foreground",
                      scoringDisabled && "cursor-default",
                    )}
                    title={`Set ${player.displayName} as server`}
                  >
                    {player.displayName}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-2">
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

      {onSetPoints ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {milestones.map((target) => {
            const disabledBtn = !canSetPoints || points === target;
            return (
              <Button
                key={target}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-[3.25rem] touch-manipulation rounded-full px-2.5 text-xs font-semibold tabular-nums"
                disabled={disabledBtn}
                onClick={() => onSetPoints(target)}
                aria-label={`Set ${name} points to ${target}`}
              >
                +{target}
              </Button>
            );
          })}
        </div>
      ) : points >= (milestones[milestones.length - 1] ?? 40) ? (
        <p className="text-center text-[11px] text-cp-muted">Game point reached</p>
      ) : null}
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
        {milestones.map((m) => (
          <span
            key={m}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
              lead >= m
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/15 text-white/45",
            )}
          >
            {m}
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
