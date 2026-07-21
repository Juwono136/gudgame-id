"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Minus, Pencil, Play, Plus, Radio } from "lucide-react";
import { DeuceScoreBadge } from "@/components/tournaments/fun-match/deuce-score-badge";
import {
  GameRaceScoreBadge,
  GameRaceScoreboard,
} from "@/components/tournaments/game-race-scoreboard";
import { Button } from "@/components/ui/button";
import {
  emptyMatchGameState,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import {
  buildGroupCourtLockState,
  groupMatchLockReason,
  isGroupMatchLockedForCourt,
} from "@/lib/tournaments/double-stage/group-court-lock";
import {
  formatGroupFixtureLabel,
  type StartableGroupFixture,
} from "@/lib/tournaments/double-stage/view-mappers";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import {
  isAmericanoPairKey,
  resolveAmericanoPairLabels,
  type AmericanoPlayerRef,
} from "@/lib/tournaments/americano/court-assignments";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import {
  canIncrementScore,
  type ScoringRules,
} from "@/lib/tournaments/scoring/engine";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { uniquePlayerNames } from "@/lib/format/player-names";
import type { ScoreAdjustOptions } from "@/lib/tournaments/scoring/match-score-events";
import { aggregateScorerPoints } from "@/lib/tournaments/scoring/match-score-events";
import { cn } from "@/lib/utils";

const SELECT_NONE = "__none__";

type FunMatchRoundMatchCardProps = {
  match?: ReclubMatchView | null;
  courtName: string;
  courtId?: string;
  teams?: LobbyTeamView[];
  teamAId?: string;
  teamBId?: string;
  bracketMatchId?: string;
  startableBracketMatches?: BracketMatchView[];
  startableGroupMatches?: StartableGroupFixture[];
  groupMatchId?: string;
  activeGroupMatches?: GroupMatchView[];
  /** Idle-court fixture picks keyed by court id — used to reserve teams across courts. */
  groupPickByCourt?: Record<string, string>;
  isGroupStageMode?: boolean;
  onGroupPickChange?: (v: string) => void;
  onTeamAChange?: (v: string) => void;
  onTeamBChange?: (v: string) => void;
  onBracketPickChange?: (v: string) => void;
  onStart?: () => void;
  isStarting?: boolean;
  canManage?: boolean;
  pointsPerMatch?: number;
  scoringRules?: ScoringRules;
  /** When set, live scoring uses race-to-N games UI instead of flat points. */
  gameRules?: MatchGameRules | null;
  onScoreChange?: (input: {
    scoreA: number;
    scoreB: number;
    action?: "increment" | "decrement" | "set" | "set_points" | "next_game";
    side?: "a" | "b";
    targetPoints?: number;
    scorerName?: string;
    scorerUserId?: string;
  }) => void | Promise<unknown>;
  onComplete?: () => void;
  onEditCourtName?: () => void;
  readOnly?: boolean;
  accentVariant?: "fun" | "official";
  isAmericanoMode?: boolean;
  americanoPlayers?: AmericanoPlayerRef[];
};

function TeamColumn({
  teamName,
  players,
  align,
  accentVariant = "fun",
}: {
  teamName: string | null;
  players: string[];
  align: "left" | "right";
  accentVariant?: "fun" | "official";
}) {
  const labelClass =
    accentVariant === "official" ? "text-cp-primary/90" : "text-emerald-400/90";
  return (
    <div className={cn("min-w-0 overflow-hidden", align === "right" && "text-right")}>
      <p className={cn("truncate text-[11px] font-bold uppercase tracking-wide sm:text-xs", labelClass)}>
        {teamName ?? "TBD"}
      </p>
      <div
        className={cn(
          "mt-1 flex flex-col gap-0.5",
          align === "right" && "items-end",
        )}
      >
        {players.length ? (
          players.map((name) => (
            <span
              key={`${teamName}-${name}`}
              className="line-clamp-2 break-words text-xs font-medium leading-snug text-foreground sm:line-clamp-none sm:truncate sm:text-sm"
              title={name}
            >
              {name}
            </span>
          ))
        ) : (
          <span className="text-xs text-cp-muted sm:text-sm">—</span>
        )}
      </div>
    </div>
  );
}

function ScoreBox({
  score,
  onIncrement,
  onDecrement,
  disabled,
  readOnly,
  canInc,
  compact,
}: {
  score: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  canInc?: boolean;
  compact?: boolean;
}) {
  const boxClass = cn(
    "flex items-center justify-center rounded-lg bg-zinc-900 font-bold tabular-nums text-white",
    compact
      ? "h-10 w-11 text-lg"
      : "h-12 w-14 text-xl sm:h-14 sm:w-16 sm:text-2xl",
  );

  if (readOnly) {
    return (
      <div className={boxClass}>
        {String(score).padStart(2, "0")}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={boxClass}>
        {String(score).padStart(2, "0")}
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 touch-manipulation rounded-full active:scale-95 sm:h-7 sm:w-7"
          disabled={disabled || score <= 0}
          onClick={onDecrement}
          aria-label="Decrease score"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 touch-manipulation rounded-full active:scale-95 sm:h-7 sm:w-7"
          disabled={disabled || canInc === false}
          onClick={onIncrement}
          aria-label="Increase score"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function formatBracketPick(m: BracketMatchView): string {
  return `R${m.roundNumber} · M${m.matchNumber} — ${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`;
}

export function FunMatchRoundMatchCard({
  match,
  courtName,
  courtId,
  teams = [],
  teamAId = "",
  teamBId = "",
  bracketMatchId = "",
  startableBracketMatches = [],
  startableGroupMatches = [],
  groupMatchId = "",
  activeGroupMatches = [],
  groupPickByCourt = {},
  isGroupStageMode = false,
  onGroupPickChange,
  onTeamAChange,
  onTeamBChange,
  onBracketPickChange,
  onStart,
  isStarting,
  canManage,
  pointsPerMatch = 16,
  scoringRules,
  gameRules = null,
  onScoreChange,
  onComplete,
  onEditCourtName,
  readOnly,
  accentVariant = "fun",
  isAmericanoMode = false,
  americanoPlayers = [],
}: FunMatchRoundMatchCardProps) {
  const finalBadgeClass =
    accentVariant === "official"
      ? "bg-cp-primary/15 text-cp-primary"
      : "bg-emerald-500/15 text-emerald-300";
  const isLive = match?.status === "in_progress";
  const isDone = match?.status === "completed";
  const isPlanning = !match && canManage && !readOnly;
  const useGroupPicker = isPlanning && isGroupStageMode && startableGroupMatches.length > 0;
  const useBracketPicker =
    isPlanning && !useGroupPicker && startableBracketMatches.length > 0;
  const groupLock = useMemo(() => {
    const reservedPicks = Object.entries(groupPickByCourt)
      .filter(([id, matchId]) => Boolean(matchId) && id !== courtId)
      .map(([, matchId]) => {
        const fixture = startableGroupMatches.find((m) => m.id === matchId);
        return {
          matchId,
          teamAId: fixture?.teamAId ?? null,
          teamBId: fixture?.teamBId ?? null,
        };
      });
    return buildGroupCourtLockState(activeGroupMatches, {
      excludeCourtId: courtId,
      reservedPicks,
    });
  }, [activeGroupMatches, courtId, groupPickByCourt, startableGroupMatches]);

  const serverScoreA = match?.scoreA ?? 0;
  const serverScoreB = match?.scoreB ?? 0;
  const serverGameState = match?.gameState ?? emptyMatchGameState();
  const [localScores, setLocalScores] = useState<{ a: number; b: number } | null>(null);
  const [gamesWritePending, setGamesWritePending] = useState(false);
  const scoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localScoresRef = useRef(localScores);
  localScoresRef.current = localScores;
  /** Serializes games-mode +/- so each click waits for the previous server write. */
  const gamesWriteChainRef = useRef(Promise.resolve());
  const gamesWriteDepthRef = useRef(0);

  useEffect(() => {
    // Reset when switching matches or leaving live state.
    if (!isLive) {
      dirtyRef.current = false;
      setLocalScores(null);
      setGamesWritePending(false);
      gamesWriteDepthRef.current = 0;
      return;
    }
    if (dirtyRef.current) {
      const pending = localScoresRef.current;
      if (pending != null && pending.a === serverScoreA && pending.b === serverScoreB) {
        dirtyRef.current = false;
        setLocalScores(null);
      }
      return;
    }
    setLocalScores(null);
  }, [isLive, match?.id, match?.status, serverScoreA, serverScoreB]);

  useEffect(
    () => () => {
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
    },
    [],
  );

  const scoreA = localScores?.a ?? serverScoreA;
  const scoreB = localScores?.b ?? serverScoreB;
  // Games mode: always trust server/cache — never a divergent optimistic layer.
  const displayGamesA = serverScoreA;
  const displayGamesB = serverScoreB;
  const activeGameState = serverGameState;

  const adjustScore = useCallback(
    (side: "a" | "b", delta: 1 | -1, scorer?: ScoreAdjustOptions | string) => {
      if (!onScoreChange || readOnly || !isLive) return;
      const scorerName = typeof scorer === "string" ? scorer : scorer?.scorerName;
      const scorerUserId = typeof scorer === "string" ? undefined : scorer?.scorerUserId;

      // Games mode: queue server deltas strictly in order (no optimistic desync).
      if (gameRules) {
        const run = async () => {
          gamesWriteDepthRef.current += 1;
          setGamesWritePending(true);
          try {
            await onScoreChange({
              // Absolute scores are ignored for increment/decrement on the server;
              // side + action drive applyGamePointDelta against the latest DB row.
              scoreA: 0,
              scoreB: 0,
              action: delta > 0 ? "increment" : "decrement",
              side,
              scorerName: delta > 0 ? scorerName : undefined,
              scorerUserId: delta > 0 ? scorerUserId : undefined,
            });
          } catch {
            // Mutation hook already toasts; keep the queue moving.
          } finally {
            gamesWriteDepthRef.current = Math.max(0, gamesWriteDepthRef.current - 1);
            if (gamesWriteDepthRef.current === 0) setGamesWritePending(false);
          }
        };
        gamesWriteChainRef.current = gamesWriteChainRef.current.then(run, run);
        return;
      }

      setLocalScores((prev) => {
        const baseA = prev?.a ?? serverScoreA;
        const baseB = prev?.b ?? serverScoreB;
        const nextA = side === "a" ? Math.max(0, baseA + delta) : baseA;
        const nextB = side === "b" ? Math.max(0, baseB + delta) : baseB;
        dirtyRef.current = true;
        if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
        scoreSyncRef.current = setTimeout(() => {
          void onScoreChange({
            scoreA: nextA,
            scoreB: nextB,
            action: "set",
            side,
            scorerName: delta > 0 ? scorerName : undefined,
            scorerUserId: delta > 0 ? scorerUserId : undefined,
          });
        }, 120);
        return { a: nextA, b: nextB };
      });
    },
    [gameRules, isLive, onScoreChange, readOnly, serverScoreA, serverScoreB],
  );

  const setGamePoints = useCallback(
    (side: "a" | "b", target: number, scorer?: ScoreAdjustOptions) => {
      if (!onScoreChange || readOnly || !isLive || !gameRules) return;
      const run = async () => {
        gamesWriteDepthRef.current += 1;
        setGamesWritePending(true);
        try {
          await onScoreChange({
            scoreA: side === "a" ? target : 0,
            scoreB: side === "b" ? target : 0,
            action: "set_points",
            side,
            targetPoints: target,
            scorerName: scorer?.scorerName,
            scorerUserId: scorer?.scorerUserId,
          });
        } catch {
          // Mutation hook already toasts.
        } finally {
          gamesWriteDepthRef.current = Math.max(0, gamesWriteDepthRef.current - 1);
          if (gamesWriteDepthRef.current === 0) setGamesWritePending(false);
        }
      };
      gamesWriteChainRef.current = gamesWriteChainRef.current.then(run, run);
    },
    [gameRules, isLive, onScoreChange, readOnly],
  );

  const startNextGame = useCallback(() => {
    if (!onScoreChange || readOnly || !isLive || !gameRules) return;
    const run = async () => {
      gamesWriteDepthRef.current += 1;
      setGamesWritePending(true);
      try {
        await onScoreChange({
          scoreA: 0,
          scoreB: 0,
          action: "next_game",
        });
      } catch {
        // Mutation hook already toasts.
      } finally {
        gamesWriteDepthRef.current = Math.max(0, gamesWriteDepthRef.current - 1);
        if (gamesWriteDepthRef.current === 0) setGamesWritePending(false);
      }
    };
    gamesWriteChainRef.current = gamesWriteChainRef.current.then(run, run);
  }, [gameRules, isLive, onScoreChange, readOnly]);

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);
  const pickedBracket = startableBracketMatches.find((m) => m.id === bracketMatchId);
  const pickedGroup = startableGroupMatches.find((m) => m.id === groupMatchId);
  const americanoLabels =
    isAmericanoMode && isAmericanoPairKey(teamAId) && isAmericanoPairKey(teamBId)
      ? resolveAmericanoPairLabels(teamAId, teamBId, americanoPlayers)
      : null;

  const leftTeamName =
    match?.teamAName ??
    pickedGroup?.teamAName ??
    pickedBracket?.teamAName ??
    americanoLabels?.sideALabel ??
    teamA?.name ??
    null;
  const rightTeamName =
    match?.teamBName ??
    pickedGroup?.teamBName ??
    pickedBracket?.teamBName ??
    americanoLabels?.sideBLabel ??
    teamB?.name ??
    null;

  const leftPlayers =
    match?.teamAPlayers?.length
      ? match.teamAPlayers
      : pickedGroup?.teamAPlayers?.length
        ? pickedGroup.teamAPlayers.map((p) => p.displayName)
        : pickedBracket?.teamAPlayers?.length
        ? pickedBracket.teamAPlayers
        : americanoLabels?.sideAPlayers.length
          ? americanoLabels.sideAPlayers
          : teamA?.members?.map((m) => m.displayName ?? "Player") ?? [];
  const rightPlayers =
    match?.teamBPlayers?.length
      ? match.teamBPlayers
      : pickedGroup?.teamBPlayers?.length
        ? pickedGroup.teamBPlayers.map((p) => p.displayName)
        : pickedBracket?.teamBPlayers?.length
        ? pickedBracket.teamBPlayers
        : americanoLabels?.sideBPlayers.length
          ? americanoLabels.sideBPlayers
          : teamB?.members?.map((m) => m.displayName ?? "Player") ?? [];

  const leftPlayerNames = uniquePlayerNames(leftPlayers);
  const rightPlayerNames = uniquePlayerNames(rightPlayers);
  const leftRoster = useMemo(() => {
    const fromGroup =
      activeGroupMatches.find((m) => m.id === match?.id)?.teamAPlayers ??
      pickedGroup?.teamAPlayers;
    if (fromGroup?.length) {
      return fromGroup
        .filter((p) => p.userId && p.displayName?.trim())
        .map((p) => ({ userId: p.userId, displayName: p.displayName }));
    }
    const teamId = match?.teamAId ?? teamAId;
    const members = teams.find((t) => t.id === teamId)?.members ?? [];
    if (members.length) {
      return members
        .filter((m) => m.userId && (m.displayName ?? "").trim())
        .map((m) => ({
          userId: m.userId,
          displayName: m.displayName ?? "Player",
        }));
    }
    return leftPlayerNames.map((displayName, index) => ({
      userId: `name:a:${index}:${displayName}`,
      displayName,
    }));
  }, [
    activeGroupMatches,
    leftPlayerNames,
    match?.id,
    match?.teamAId,
    pickedGroup?.teamAPlayers,
    teamAId,
    teams,
  ]);
  const rightRoster = useMemo(() => {
    const fromGroup =
      activeGroupMatches.find((m) => m.id === match?.id)?.teamBPlayers ??
      pickedGroup?.teamBPlayers;
    if (fromGroup?.length) {
      return fromGroup
        .filter((p) => p.userId && p.displayName?.trim())
        .map((p) => ({ userId: p.userId, displayName: p.displayName }));
    }
    const teamId = match?.teamBId ?? teamBId;
    const members = teams.find((t) => t.id === teamId)?.members ?? [];
    if (members.length) {
      return members
        .filter((m) => m.userId && (m.displayName ?? "").trim())
        .map((m) => ({
          userId: m.userId,
          displayName: m.displayName ?? "Player",
        }));
    }
    return rightPlayerNames.map((displayName, index) => ({
      userId: `name:b:${index}:${displayName}`,
      displayName,
    }));
  }, [
    activeGroupMatches,
    match?.id,
    match?.teamBId,
    pickedGroup?.teamBPlayers,
    rightPlayerNames,
    teamBId,
    teams,
  ]);
  const leftSingleScorer = leftPlayerNames.length === 1 ? leftPlayerNames[0]! : undefined;
  const rightSingleScorer = rightPlayerNames.length === 1 ? rightPlayerNames[0]! : undefined;
  const usePlayerPointButtons =
    isLive && !readOnly && (leftPlayerNames.length > 1 || rightPlayerNames.length > 1);

  const rules: ScoringRules | undefined =
    scoringRules ??
    (pointsPerMatch
      ? {
          pointsPerMatch,
          deuceConfig: {
            deuceEnabled: true,
            deuceThreshold: Math.max(1, pointsPerMatch - 1),
            winBy: 2,
            maxScore: pointsPerMatch + 10,
          },
          scoringType: "points",
        }
      : undefined);

  const canIncA =
    rules && isLive ? canIncrementScore(scoreA, scoreB, "a", rules) : true;
  const canIncB =
    rules && isLive ? canIncrementScore(scoreA, scoreB, "b", rules) : true;

  const pickedGroupLocked =
    Boolean(pickedGroup) && isGroupMatchLockedForCourt(pickedGroup!, groupLock);
  const canStartGroup = useGroupPicker && Boolean(groupMatchId) && !pickedGroupLocked;
  const canStartBracket = useBracketPicker && Boolean(bracketMatchId);
  const canStartAmericano = isAmericanoMode && Boolean(americanoLabels);
  const canStartSquads =
    !useBracketPicker &&
    !isAmericanoMode &&
    Boolean(teamAId && teamBId && teamAId !== teamBId);

  const scoreReadOnly = readOnly || !isLive;
  const gamesLiveBoard = Boolean(gameRules && isLive && !readOnly);

  const scoreBoxes = gameRules ? (
    gamesLiveBoard ? (
      <GameRaceScoreboard
        teamAName={leftTeamName ?? "Team A"}
        teamBName={rightTeamName ?? "Team B"}
        teamAPlayers={leftPlayerNames}
        teamBPlayers={rightPlayerNames}
        rosterA={leftRoster}
        rosterB={rightRoster}
        gamesA={displayGamesA}
        gamesB={displayGamesB}
        gameState={activeGameState}
        rules={gameRules}
        disabled={!canManage}
        syncing={gamesWritePending}
        onPointA={(delta, scorer) => adjustScore("a", delta, scorer ?? leftSingleScorer)}
        onPointB={(delta, scorer) => adjustScore("b", delta, scorer ?? rightSingleScorer)}
        onSetPointsA={(target, scorer) => setGamePoints("a", target, scorer)}
        onSetPointsB={(target, scorer) => setGamePoints("b", target, scorer)}
        onNextGame={startNextGame}
      />
    ) : (
      <GameRaceScoreBadge
        gamesA={scoreA}
        gamesB={scoreB}
        currentPointsA={isLive ? activeGameState.currentPointsA : undefined}
        currentPointsB={isLive ? activeGameState.currentPointsB : undefined}
        showRally={isLive}
      />
    )
  ) : (
    <div className="flex flex-col items-center gap-2">
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ScoreBox
          score={scoreA}
          readOnly={scoreReadOnly}
          disabled={!canManage}
          canInc={canIncA && !usePlayerPointButtons}
          compact={scoreReadOnly}
          onIncrement={() => adjustScore("a", 1, leftSingleScorer)}
          onDecrement={() => adjustScore("a", -1)}
        />
        <ScoreBox
          score={scoreB}
          readOnly={scoreReadOnly}
          disabled={!canManage}
          canInc={canIncB && !usePlayerPointButtons}
          compact={scoreReadOnly}
          onIncrement={() => adjustScore("b", 1, rightSingleScorer)}
          onDecrement={() => adjustScore("b", -1)}
        />
      </div>
      {usePlayerPointButtons ? (
        <div className="grid w-full max-w-md grid-cols-2 gap-2 px-1">
          <div className="flex flex-wrap justify-center gap-1">
            {leftPlayerNames.map((name) => (
              <Button
                key={`a-${name}`}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 max-w-full truncate rounded-full px-2 text-[10px]"
                disabled={!canManage || !canIncA}
                onClick={() => adjustScore("a", 1, name)}
              >
                <Plus className="mr-0.5 h-3 w-3 shrink-0" />
                {name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {rightPlayerNames.map((name) => (
              <Button
                key={`b-${name}`}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 max-w-full truncate rounded-full px-2 text-[10px]"
                disabled={!canManage || !canIncB}
                onClick={() => adjustScore("b", 1, name)}
              >
                <Plus className="mr-0.5 h-3 w-3 shrink-0" />
                {name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {isLive && rules ? (
        <DeuceScoreBadge scoreA={scoreA} scoreB={scoreB} rules={rules} />
      ) : null}
    </div>
  );

  const scorerBreakdown =
    gameRules && match?.scoreEvents?.length ? (
      <ScorerBreakdown events={match.scoreEvents} />
    ) : null;

  return (
    <article
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border bg-cp-elevated/20 p-3 transition-colors sm:p-4",
        isLive
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : isDone
            ? "border-cp-border/80 opacity-90"
            : "border-cp-border",
      )}
    >
      {gamesLiveBoard ? (
        /* Games mode: full-width board owns team + player labels (avoids clipped side columns). */
        <div className="min-w-0">{scoreBoxes}</div>
      ) : (
        <>
          {/* Mobile: teams on top, scores below */}
          <div className="space-y-3 sm:hidden">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <TeamColumn
                teamName={leftTeamName}
                players={leftPlayerNames}
                align="left"
                accentVariant={accentVariant}
              />
              <TeamColumn
                teamName={rightTeamName}
                players={rightPlayerNames}
                align="right"
                accentVariant={accentVariant}
              />
            </div>
            <div className="flex justify-center border-t border-cp-border/40 pt-3">
              {scoreBoxes}
            </div>
          </div>

          {/* Tablet/desktop: classic three-column layout */}
          <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:grid sm:gap-4">
            <TeamColumn
              teamName={leftTeamName}
              players={leftPlayerNames}
              align="left"
              accentVariant={accentVariant}
            />
            {scoreBoxes}
            <TeamColumn
              teamName={rightTeamName}
              players={rightPlayerNames}
              align="right"
              accentVariant={accentVariant}
            />
          </div>
        </>
      )}

      {scorerBreakdown}

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cp-border/60 pt-2.5">
        <div className="flex items-center gap-1.5 text-xs text-cp-muted">
          <span className="font-medium text-foreground">{courtName}</span>
          {canManage && onEditCourtName && !readOnly ? (
            <button
              type="button"
              onClick={onEditCourtName}
              className="rounded p-0.5 text-cp-muted hover:bg-cp-elevated hover:text-foreground"
              aria-label="Rename court"
            >
              <Pencil className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              <Radio className="h-3 w-3" />
              Live
            </span>
          ) : isDone ? (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", finalBadgeClass)}>
              <CheckCircle2 className="h-3 w-3" />
              {isGroupStageMode ? "Ended" : "Final"}
            </span>
          ) : null}

          {isPlanning ? (
            <>
              {useGroupPicker ? (
                <Select
                  value={groupMatchId || SELECT_NONE}
                  onValueChange={(v) => onGroupPickChange?.(v === SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-8 w-[12rem] text-xs sm:w-56")}>
                    <SelectValue placeholder="Group fixture" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value={SELECT_NONE} className={cpSelectItemClass}>
                      Group fixture…
                    </SelectItem>
                    {startableGroupMatches.map((m) => {
                      const locked = isGroupMatchLockedForCourt(m, groupLock);
                      const reason = groupMatchLockReason(m, groupLock);
                      return (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          disabled={locked}
                          className={cpSelectItemClass}
                          title={reason ?? undefined}
                        >
                          {formatGroupFixtureLabel(m)}
                          {locked ? " (busy)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : useBracketPicker ? (
                <Select
                  value={bracketMatchId || SELECT_NONE}
                  onValueChange={(v) =>
                    onBracketPickChange?.(v === SELECT_NONE ? "" : v)
                  }
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-8 w-[12rem] text-xs sm:w-56")}>
                    <SelectValue placeholder="Bracket match" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value={SELECT_NONE} className={cpSelectItemClass}>
                      Bracket match…
                    </SelectItem>
                    {startableBracketMatches.map((m) => (
                      <SelectItem key={m.id} value={m.id} className={cpSelectItemClass}>
                        {formatBracketPick(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : isAmericanoMode ? (
                <span className="text-[11px] text-cp-muted">
                  {americanoLabels ? "Pairings ready" : "Use Apply plan or Reshuffle"}
                </span>
              ) : (
                <>
                  <Select
                    value={teamAId || SELECT_NONE}
                    onValueChange={(v) => onTeamAChange?.(v === SELECT_NONE ? "" : v)}
                  >
                    <SelectTrigger className={cn(cpSelectTriggerClass, "h-8 w-[7rem] text-xs")}>
                      <SelectValue placeholder="Squad A" />
                    </SelectTrigger>
                    <SelectContent className={cpSelectContentClass}>
                      <SelectItem value={SELECT_NONE} className={cpSelectItemClass}>
                        Squad A…
                      </SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={teamBId || SELECT_NONE}
                    onValueChange={(v) => onTeamBChange?.(v === SELECT_NONE ? "" : v)}
                  >
                    <SelectTrigger className={cn(cpSelectTriggerClass, "h-8 w-[7rem] text-xs")}>
                      <SelectValue placeholder="Squad B" />
                    </SelectTrigger>
                    <SelectContent className={cpSelectContentClass}>
                      <SelectItem value={SELECT_NONE} className={cpSelectItemClass}>
                        Squad B…
                      </SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1"
                disabled={(!canStartGroup && !canStartBracket && !canStartSquads && !canStartAmericano) || isStarting}
                onClick={onStart}
              >
                <Play className="h-3.5 w-3.5" />
                Start
              </Button>
            </>
          ) : null}

          {isLive && canManage && onComplete && !readOnly ? (
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={onComplete}>
              Finish
            </Button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function ScorerBreakdown({
  events,
}: {
  events: NonNullable<ReclubMatchView["scoreEvents"]>;
}) {
  const totals = aggregateScorerPoints(events);
  if (!totals.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-cp-border/70 bg-cp-elevated/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
        Points this match
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {totals.map((row) => (
          <li
            key={row.key}
            className="rounded-full border border-cp-border/80 bg-cp-card px-2.5 py-0.5 text-[11px] text-foreground"
          >
            <span className="font-medium">{row.displayName}</span>
            <span className="ml-1 tabular-nums text-cp-muted">{row.points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
