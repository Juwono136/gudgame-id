"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Scale } from "lucide-react";
import { GameRaceScoreboard } from "@/components/tournaments/game-race-scoreboard";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import { ScoreOverrideDialog } from "@/components/tournaments/manage/score-override-dialog";
import { SpecialResultDialog } from "@/components/tournaments/manage/special-result-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import {
  emptyMatchGameState,
  isRaceToGamesMatchComplete,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import {
  isClassicMatchComplete,
  setsNeededToWinMatch,
  type ClassicSetRules,
} from "@/lib/tournaments/scoring/classic-sets";
import type { ScoreAdjustOptions } from "@/lib/tournaments/scoring/match-score-events";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type LivePointInput = {
  scoreA: number;
  scoreB: number;
  scoreAction: "increment" | "decrement" | "next_game" | "set_points";
  side?: "a" | "b";
  targetPoints?: number;
  scorerName?: string;
  scorerUserId?: string;
  servingSide?: "a" | "b";
  serverName?: string;
  serverUserId?: string;
};

type DoubleStageGroupMatchCardProps = {
  match: GroupMatchView;
  maxScore: number;
  busy: boolean;
  /** When set, use race-to-N games scoreboard + live point deltas. */
  gameRules?: MatchGameRules | null;
  /** ITF/FIP classic sets format (partner tennis/padel). */
  classicSetRules?: ClassicSetRules | null;
  /** paper = enter final games score without rally-by-rally tablet flow. */
  scoreEntryMode?: "live" | "paper";
  sportSlug?: string;
  tournamentSlug?: string;
  onStart: () => void;
  onLivePoint?: (input: LivePointInput) => void | Promise<unknown>;
  onFinalize: (scores: { scoreA: number; scoreB: number }) => void;
  onOverrideSuccess?: () => void;
};

export function DoubleStageGroupMatchCard({
  match,
  maxScore,
  busy,
  gameRules = null,
  classicSetRules = null,
  scoreEntryMode = "live",
  sportSlug,
  tournamentSlug,
  onStart,
  onLivePoint,
  onFinalize,
  onOverrideSuccess,
}: DoubleStageGroupMatchCardProps) {
  const { confirm } = useConfirmDialog();
  const isPending = match.status === "pending";
  const isLive = match.status === "in_progress";
  const isDone = match.status === "completed";
  const paperMode = scoreEntryMode === "paper";
  const canScore = isLive && !busy;
  const gamesMode = Boolean(gameRules);
  const classicMode = Boolean(classicSetRules);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);

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
  const rosterA = match.teamAPlayers
    .filter((p) => p.userId && p.displayName)
    .map((p) => ({ userId: p.userId, displayName: p.displayName }));
  const rosterB = match.teamBPlayers
    .filter((p) => p.userId && p.displayName)
    .map((p) => ({ userId: p.userId, displayName: p.displayName }));
  const statusLabel = match.status.replace("_", " ");
  const gameState = match.gameState ?? emptyMatchGameState();

  const canFinalize = (() => {
    if (!isLive || busy) return false;
    if (classicSetRules) {
      return isClassicMatchComplete(serverScoreA, serverScoreB, classicSetRules).complete;
    }
    if (!gameRules) return true;
    return isRaceToGamesMatchComplete(serverScoreA, serverScoreB, gameRules).complete;
  })();

  const queueLivePoint = (
    side: "a" | "b",
    delta: 1 | -1,
    server?: ScoreAdjustOptions,
  ) => {
    if (!onLivePoint || !canScore) return;
    const serverName = server?.serverName ?? server?.scorerName;
    const serverUserId = server?.serverUserId ?? server?.scorerUserId;
    const run = async () => {
      gamesWriteDepthRef.current += 1;
      setSyncing(true);
      try {
        await onLivePoint({
          scoreA: 0,
          scoreB: 0,
          scoreAction: delta > 0 ? "increment" : "decrement",
          side,
          servingSide: server?.servingSide,
          serverName,
          serverUserId,
          scorerName: serverName,
          scorerUserId: serverUserId,
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

  const queueSetPoints = (
    side: "a" | "b",
    target: number,
    server?: ScoreAdjustOptions,
  ) => {
    if (!onLivePoint || !canScore) return;
    const serverName = server?.serverName ?? server?.scorerName;
    const serverUserId = server?.serverUserId ?? server?.scorerUserId;
    const run = async () => {
      gamesWriteDepthRef.current += 1;
      setSyncing(true);
      try {
        await onLivePoint({
          scoreA: side === "a" ? target : 0,
          scoreB: side === "b" ? target : 0,
          scoreAction: "set_points",
          side,
          targetPoints: target,
          servingSide: server?.servingSide,
          serverName,
          serverUserId,
          scorerName: serverName,
          scorerUserId: serverUserId,
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

  const queueNextGame = (server?: ScoreAdjustOptions) => {
    if (!onLivePoint || !canScore) return;
    const run = async () => {
      gamesWriteDepthRef.current += 1;
      setSyncing(true);
      try {
        await onLivePoint({
          scoreA: 0,
          scoreB: 0,
          servingSide: server?.servingSide,
          serverName: server?.serverName ?? server?.scorerName,
          serverUserId: server?.serverUserId ?? server?.scorerUserId,
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

  const handleFinish = async () => {
    const scoreA = gamesMode && !paperMode ? serverScoreA : localScoreA;
    const scoreB = gamesMode && !paperMode ? serverScoreB : localScoreB;
    const ok = await confirm({
      title: "Finish this match?",
      description: `Record final score ${scoreA}–${scoreB} for ${match.teamAName ?? "Team A"} vs ${match.teamBName ?? "Team B"}. Standings and fixtures will update immediately.`,
      confirmLabel: "Finish match",
      cancelLabel: "Keep scoring",
    });
    if (!ok) return;
    onFinalize({ scoreA, scoreB });
  };

  const paperCanFinalize =
    isLive &&
    !busy &&
    Number.isFinite(localScoreA) &&
    Number.isFinite(localScoreB) &&
    localScoreA >= 0 &&
    localScoreB >= 0 &&
    localScoreA !== localScoreB;

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
            {paperMode ? " · Paper" : null}
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

      {paperMode && (isLive || isPending) ? (
        <div className={cn("grid gap-3 sm:grid-cols-2", isPending && "opacity-60")}>
          <div className="space-y-1.5">
            <Label htmlFor={`paper-a-${match.id}`} className="text-xs text-cp-muted">
              {match.teamAName ?? "Team A"} — {classicMode ? "sets" : "games"}
            </Label>
            <Input
              id={`paper-a-${match.id}`}
              type="number"
              min={0}
              inputMode="numeric"
              disabled={!canScore}
              value={localScoreA}
              onChange={(e) => setLocalScoreA(Number.parseInt(e.target.value, 10) || 0)}
              className="border-cp-border bg-cp-elevated"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`paper-b-${match.id}`} className="text-xs text-cp-muted">
              {match.teamBName ?? "Team B"} — {classicMode ? "sets" : "games"}
            </Label>
            <Input
              id={`paper-b-${match.id}`}
              type="number"
              min={0}
              inputMode="numeric"
              disabled={!canScore}
              value={localScoreB}
              onChange={(e) => setLocalScoreB(Number.parseInt(e.target.value, 10) || 0)}
              className="border-cp-border bg-cp-elevated"
            />
          </div>
          <p className="text-xs text-cp-muted sm:col-span-2">
            Enter the final {classicMode ? "sets" : "games"} score from paper sheets, then
            finish the match.
          </p>
        </div>
      ) : gamesMode && gameRules ? (
        <GameRaceScoreboard
          teamAName={match.teamAName ?? "Team A"}
          teamBName={match.teamBName ?? "Team B"}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          rosterA={rosterA}
          rosterB={rosterB}
          gamesA={serverScoreA}
          gamesB={serverScoreB}
          gameState={gameState}
          rules={gameRules}
          classicSets={classicMode}
          setsToWin={
            classicSetRules
              ? setsNeededToWinMatch(classicSetRules.bestOfSets)
              : undefined
          }
          disabled={!canScore || !onLivePoint}
          syncing={syncing}
          onPointA={(delta, scorer) => queueLivePoint("a", delta, scorer)}
          onPointB={(delta, scorer) => queueLivePoint("b", delta, scorer)}
          onSetPointsA={(target, scorer) => queueSetPoints("a", target, scorer)}
          onSetPointsB={(target, scorer) => queueSetPoints("b", target, scorer)}
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {sportSlug && tournamentSlug ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-cp-border sm:w-auto"
                disabled={busy}
                onClick={() => setSpecialOpen(true)}
              >
                WO / RET
              </Button>
            ) : null}
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
        </div>
      ) : null}

      {isLive ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-cp-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
          {sportSlug && tournamentSlug ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-cp-border sm:w-auto"
              disabled={busy}
              onClick={() => setSpecialOpen(true)}
            >
              WO / RET
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={paperMode ? !paperCanFinalize : !canFinalize || syncing}
            onClick={() => void handleFinish()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finish
          </Button>
        </div>
      ) : null}

      {isDone ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-cp-muted sm:text-left">
            Final {gamesMode ? "game " : ""}score recorded.
          </p>
          {sportSlug && tournamentSlug ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-cp-border"
              onClick={() => setOverrideOpen(true)}
            >
              <Scale className="mr-1.5 h-3.5 w-3.5" />
              Override
            </Button>
          ) : null}
        </div>
      ) : null}

      {sportSlug && tournamentSlug ? (
        <>
          <ScoreOverrideDialog
            open={overrideOpen}
            onOpenChange={setOverrideOpen}
            sportSlug={sportSlug}
            tournamentSlug={tournamentSlug}
            kind="group"
            matchId={match.id}
            teamAName={match.teamAName}
            teamBName={match.teamBName}
            initialScoreA={match.scoreA ?? 0}
            initialScoreB={match.scoreB ?? 0}
            onSuccess={onOverrideSuccess}
          />
          <SpecialResultDialog
            open={specialOpen}
            onOpenChange={setSpecialOpen}
            sportSlug={sportSlug}
            tournamentSlug={tournamentSlug}
            kind="group"
            matchId={match.id}
            teamAName={match.teamAName}
            teamBName={match.teamBName}
            onSuccess={onOverrideSuccess}
          />
        </>
      ) : null}
    </article>
  );
}
