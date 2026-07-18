"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { GameRaceScoreboard } from "@/components/tournaments/game-race-scoreboard";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import {
  emptyMatchGameState,
  isRaceToGamesMatchComplete,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import { cn } from "@/lib/utils";

type DoubleStageGroupMatchCardProps = {
  match: GroupMatchView;
  maxScore: number;
  busy: boolean;
  /** When set, use race-to-N games scoreboard + live point deltas. */
  gameRules?: MatchGameRules | null;
  onStart: () => void;
  onLivePoint?: (input: {
    scoreA: number;
    scoreB: number;
    scoreAction: "increment" | "decrement" | "next_game";
    side?: "a" | "b";
  }) => void | Promise<unknown>;
  onFinalize: (scores: { scoreA: number; scoreB: number }) => void;
};

export function DoubleStageGroupMatchCard({
  match,
  maxScore,
  busy,
  gameRules = null,
  onStart,
  onLivePoint,
  onFinalize,
}: DoubleStageGroupMatchCardProps) {
  const isPending = match.status === "pending";
  const isLive = match.status === "in_progress";
  const isDone = match.status === "completed";
  const canScore = isLive && !busy;
  const gamesMode = Boolean(gameRules);

  const serverScoreA = match.scoreA ?? 0;
  const serverScoreB = match.scoreB ?? 0;
  const [localScoreA, setLocalScoreA] = useState(serverScoreA);
  const [localScoreB, setLocalScoreB] = useState(serverScoreB);
  const [syncing, setSyncing] = useState(false);
  const gamesWriteChainRef = useRef(Promise.resolve());
  const gamesWriteDepthRef = useRef(0);

  useEffect(() => {
    setLocalScoreA(serverScoreA);
    setLocalScoreB(serverScoreB);
  }, [match.id, serverScoreA, serverScoreB, match.status]);

  const teamAPlayers = match.teamAPlayers.map((p) => p.displayName).filter(Boolean);
  const teamBPlayers = match.teamBPlayers.map((p) => p.displayName).filter(Boolean);
  const statusLabel = match.status.replace("_", " ");
  const gameState = match.gameState ?? emptyMatchGameState();

  const canFinalize = (() => {
    if (!isLive || busy) return false;
    if (!gameRules) return true;
    return isRaceToGamesMatchComplete(serverScoreA, serverScoreB, gameRules).complete;
  })();

  const queueLivePoint = (side: "a" | "b", delta: 1 | -1) => {
    if (!onLivePoint || !canScore) return;
    const run = async () => {
      gamesWriteDepthRef.current += 1;
      setSyncing(true);
      try {
        await onLivePoint({
          scoreA: 0,
          scoreB: 0,
          scoreAction: delta > 0 ? "increment" : "decrement",
          side,
        });
      } catch {
        // Parent toasts errors.
      } finally {
        gamesWriteDepthRef.current = Math.max(0, gamesWriteDepthRef.current - 1);
        if (gamesWriteDepthRef.current === 0) setSyncing(false);
      }
    };
    gamesWriteChainRef.current = gamesWriteChainRef.current.then(run, run);
  };

  const queueNextGame = () => {
    if (!onLivePoint || !canScore) return;
    const run = async () => {
      gamesWriteDepthRef.current += 1;
      setSyncing(true);
      try {
        await onLivePoint({
          scoreA: 0,
          scoreB: 0,
          scoreAction: "next_game",
        });
      } catch {
        // Parent toasts errors.
      } finally {
        gamesWriteDepthRef.current = Math.max(0, gamesWriteDepthRef.current - 1);
        if (gamesWriteDepthRef.current === 0) setSyncing(false);
      }
    };
    gamesWriteChainRef.current = gamesWriteChainRef.current.then(run, run);
  };

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border bg-cp-card p-3 sm:p-4",
        isLive
          ? "border-cp-primary/40 ring-1 ring-cp-primary/20"
          : isDone
            ? "border-emerald-600/25"
            : "border-cp-border",
      )}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-cp-border pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">
            Match {match.matchNumber}
          </p>
          <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-foreground sm:text-base">
            {match.teamAName ?? "Team A"}{" "}
            <span className="font-normal text-cp-muted">vs</span> {match.teamBName ?? "Team B"}
          </p>
        </div>
        <Badge
          variant="muted"
          className={cn(
            "shrink-0 capitalize",
            isDone &&
              "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
            isLive &&
              "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      {gamesMode && gameRules ? (
        <GameRaceScoreboard
          teamAName={match.teamAName ?? "Team A"}
          teamBName={match.teamBName ?? "Team B"}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          gamesA={serverScoreA}
          gamesB={serverScoreB}
          gameState={gameState}
          rules={gameRules}
          disabled={!canScore || !onLivePoint}
          syncing={syncing}
          onPointA={(delta) => queueLivePoint("a", delta)}
          onPointB={(delta) => queueLivePoint("b", delta)}
          onNextGame={queueNextGame}
          className={cn(isPending && "opacity-60")}
        />
      ) : (
        <LiveScoreboard
          variant="compact"
          teamAName={match.teamAName ?? "Team A"}
          teamBName={match.teamBName ?? "Team B"}
          teamAPlayers={teamAPlayers.length ? teamAPlayers : undefined}
          teamBPlayers={teamBPlayers.length ? teamBPlayers : undefined}
          scoreA={isDone ? serverScoreA : localScoreA}
          scoreB={isDone ? serverScoreB : localScoreB}
          maxScore={maxScore}
          disabled={!canScore}
          onScoreAChange={setLocalScoreA}
          onScoreBChange={setLocalScoreB}
          className={cn(isPending && "opacity-60")}
        />
      )}

      {isPending ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-cp-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-cp-muted sm:text-left">
            Start the match to enable scoring controls.
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={onStart}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Start match
          </Button>
        </div>
      ) : null}

      {isLive ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-cp-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!canFinalize || syncing}
            onClick={() =>
              onFinalize({
                scoreA: gamesMode ? serverScoreA : localScoreA,
                scoreB: gamesMode ? serverScoreB : localScoreB,
              })
            }
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finalize score
          </Button>
        </div>
      ) : null}

      {isDone ? (
        <p className="mt-3 text-center text-xs text-cp-muted sm:text-left">
          Final {gamesMode ? "game " : ""}score recorded.
        </p>
      ) : null}
    </article>
  );
}
