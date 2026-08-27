"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GAME_RALLY_MILESTONES,
  formatGamesMatchLengthHint,
  formatGamesMatchLengthLabel,
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
  /**
   * `courtside` — solid opaque surfaces + larger touch targets for field tablets.
   * Default keeps lighter command-center chrome.
   */
  presentation?: "default" | "courtside";
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
  presentation = "default",
}: GameRaceScoreboardProps) {
  const courtside = presentation === "courtside";
  const needSets = setsToWin ?? Math.max(1, Math.ceil((rules.raceToGames || 2)));
  const matchComplete = classicSets
    ? Math.max(gamesA, gamesB) >= needSets
    : (rules.lengthMode ?? "race_to") === "total"
      ? gamesA + gamesB >= rules.raceToGames
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
    : `Match · ${formatGamesMatchLengthLabel(rules)}`;

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
    <div className={cn("w-full min-w-0 space-y-3", courtside && "space-y-4", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
          courtside
            ? "border-cp-border bg-cp-elevated px-4 py-3 sm:px-5"
            : "border-cp-border bg-cp-elevated",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            {headerLabel}
          </p>
          <p
            className={cn(
              "mt-0.5 font-bold tabular-nums text-foreground",
              courtside ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
            )}
          >
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
                  ? "border-cp-primary/40 bg-cp-primary/15 text-cp-primary"
                  : "border-cp-border bg-cp-card text-cp-muted",
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

      <div
        className={cn(
          "rounded-2xl border border-cp-border p-3 sm:p-4",
          courtside ? "bg-cp-elevated p-4 sm:p-5" : "bg-cp-elevated/80",
        )}
      >
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

        <div
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-3",
            courtside && "gap-3 sm:gap-4",
          )}
        >
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
            courtside={courtside}
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
            courtside={courtside}
          />
        </div>

        {gameHeld && winnerName ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-cp-primary/30 bg-cp-primary/10 px-3 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">
              {winnerName} won this {inTiebreak ? "tiebreak" : "game"} ({pointsA}–{pointsB})
            </p>
            {matchComplete ? (
              <p className="text-xs text-cp-muted">
                {classicSets
                  ? `First to ${needSets} sets — finish the match when ready.`
                  : `${formatGamesMatchLengthLabel(rules)} reached — finish the match when ready.`}
              </p>
            ) : (
              <Button
                type="button"
                className={cn(
                  "w-full max-w-sm touch-manipulation rounded-full px-6 font-semibold sm:w-auto",
                  courtside ? "h-12 text-base" : "h-11 text-sm",
                )}
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
        <div
          className={cn(
            "rounded-xl border px-3 py-2",
            courtside
              ? "border-cp-border bg-cp-elevated"
              : "border-cp-border/70 bg-cp-elevated/20",
          )}
        >
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
          : formatGamesMatchLengthHint(rules)}
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
  courtside = false,
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
  courtside?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 rounded-xl border p-3",
        courtside ? "gap-3 bg-cp-card p-3.5 sm:p-4" : "bg-cp-card",
        highlight
          ? "border-cp-primary/50 ring-1 ring-cp-primary/25"
          : isServingSide
            ? "border-cp-primary/40 ring-1 ring-cp-primary/20"
            : "border-cp-border",
      )}
    >
      {!hideHeader ? (
        <div className="min-w-0 w-full text-center">
          {isServingSide ? (
            <p className="mb-1 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Serving
            </p>
          ) : (
            <span className="mb-1 block h-[18px]" aria-hidden />
          )}
          <p
            className={cn(
              "truncate font-semibold text-foreground",
              courtside ? "text-base sm:text-lg" : "text-sm sm:text-base",
            )}
            title={name}
          >
            {name}
          </p>
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
                      "max-w-full truncate rounded-full border font-medium transition-colors",
                      courtside
                        ? "px-2.5 py-1 text-[11px] touch-manipulation"
                        : "px-2 py-0.5 text-[10px]",
                      active
                        ? "border-cp-primary/50 bg-cp-primary/20 text-cp-primary"
                        : "border-cp-border bg-cp-elevated text-cp-muted hover:text-foreground",
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

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            "shrink-0 touch-manipulation rounded-full border-cp-border",
            courtside ? "h-12 w-12 sm:h-11 sm:w-11" : "h-10 w-10 sm:h-9 sm:w-9",
          )}
          disabled={!canDecrement}
          onClick={onDecrement}
          aria-label={`Remove 1 point from ${name}`}
        >
          <Minus className={courtside ? "h-5 w-5" : "h-4 w-4"} />
        </Button>
        <span
          className={cn(
            "text-center font-bold tabular-nums text-foreground",
            courtside
              ? "min-w-[3.75rem] text-5xl sm:min-w-[4rem] sm:text-6xl"
              : "min-w-[3.25rem] text-4xl sm:min-w-[3.5rem] sm:text-5xl",
          )}
        >
          {points}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            "shrink-0 touch-manipulation rounded-full border-cp-border",
            courtside ? "h-12 w-12 sm:h-11 sm:w-11" : "h-10 w-10 sm:h-9 sm:w-9",
          )}
          disabled={incrementDisabled}
          onClick={onIncrement}
          aria-label={`Add 1 point to ${name}`}
        >
          <Plus className={courtside ? "h-5 w-5" : "h-4 w-4"} />
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
                className={cn(
                  "touch-manipulation rounded-full font-semibold tabular-nums",
                  courtside
                    ? "h-10 min-w-[3.75rem] px-3 text-sm"
                    : "h-8 min-w-[3.25rem] px-2.5 text-xs",
                )}
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
  lengthMode = "race_to",
  classicSets = false,
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
  lengthMode?: "race_to" | "total";
  classicSets?: boolean;
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
  const lengthLabel = classicSets
    ? `Classic sets · first to ${pointsToWinGame} pts`
    : formatGamesMatchLengthLabel({
        raceToGames,
        lengthMode,
        pointsToWinGame,
        gameDecider: "golden_point",
        pointStyle: "simple",
      });

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden px-4 py-4 text-white sm:px-8 sm:py-6",
        className,
      )}
    >
      {subtitle ? (
        <p className="mb-3 max-w-4xl truncate text-center text-xs uppercase tracking-[0.18em] text-white/55 sm:mb-4 sm:text-sm">
          {subtitle}
        </p>
      ) : null}

      <div className="mb-4 rounded-2xl border border-white/12 bg-[#0c1613] px-5 py-2.5 text-center sm:mb-6 sm:px-8 sm:py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:text-[11px]">
          {lengthLabel} · {classicSets ? "Sets won" : "Games won"}
        </p>
        <p className="mt-0.5 text-3xl font-bold tabular-nums sm:text-4xl lg:text-5xl">
          {gamesA}
          <span className="mx-2 font-light text-white/35">–</span>
          {gamesB}
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:mb-4">
        {milestones.map((m) => (
          <span
            key={m}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:px-3 sm:text-[11px]",
              lead >= m ? "text-white" : "border-white/15 text-white/45",
            )}
            style={
              lead >= m
                ? {
                    borderColor:
                      "color-mix(in srgb, var(--display-primary, #34d399) 50%, transparent)",
                    backgroundColor:
                      "color-mix(in srgb, var(--display-primary, #10b981) 20%, transparent)",
                    color:
                      "color-mix(in srgb, var(--display-primary, #a7f3d0) 90%, white)",
                  }
                : undefined
            }
          >
            {m}
          </span>
        ))}
      </div>

      <p
        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:mb-4 sm:text-[11px]"
        style={{
          color: "color-mix(in srgb, var(--display-primary, #6ee7b7) 90%, white)",
        }}
      >
        Points this game
      </p>

      <div className="grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 lg:gap-8">
        <div className="min-w-0 text-center">
          <p className="mb-2 line-clamp-2 break-words text-base font-medium text-white/80 sm:mb-3 sm:text-xl lg:text-2xl">
            {teamAName}
          </p>
          <p className="text-[clamp(2.75rem,12vh,6.5rem)] font-bold tabular-nums leading-none">
            {pointsA}
          </p>
        </div>
        <span className="text-3xl font-light text-white/35 sm:text-5xl">:</span>
        <div className="min-w-0 text-center">
          <p className="mb-2 line-clamp-2 break-words text-base font-medium text-white/80 sm:mb-3 sm:text-xl lg:text-2xl">
            {teamBName}
          </p>
          <p className="text-[clamp(2.75rem,12vh,6.5rem)] font-bold tabular-nums leading-none">
            {pointsB}
          </p>
        </div>
      </div>
    </div>
  );
}
