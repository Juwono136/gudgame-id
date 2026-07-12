"use client";

import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import { cn } from "@/lib/utils";

type DoubleStageGroupMatchCardProps = {
  match: GroupMatchView;
  maxScore: number;
  busy: boolean;
  onStart: () => void;
  onFinalize: (scores: { scoreA: number; scoreB: number }) => void;
};

export function DoubleStageGroupMatchCard({
  match,
  maxScore,
  busy,
  onStart,
  onFinalize,
}: DoubleStageGroupMatchCardProps) {
  const isPending = match.status === "pending";
  const isLive = match.status === "in_progress";
  const isDone = match.status === "completed";
  const canScore = isLive && !busy;

  const [localScoreA, setLocalScoreA] = useState(match.scoreA ?? 0);
  const [localScoreB, setLocalScoreB] = useState(match.scoreB ?? 0);

  useEffect(() => {
    setLocalScoreA(match.scoreA ?? 0);
    setLocalScoreB(match.scoreB ?? 0);
  }, [match.id, match.scoreA, match.scoreB, match.status]);

  const teamAPlayers = match.teamAPlayers.map((p) => p.displayName).filter(Boolean);
  const teamBPlayers = match.teamBPlayers.map((p) => p.displayName).filter(Boolean);

  const statusLabel = match.status.replace("_", " ");

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

      <LiveScoreboard
        variant="compact"
        teamAName={match.teamAName ?? "Team A"}
        teamBName={match.teamBName ?? "Team B"}
        teamAPlayers={teamAPlayers.length ? teamAPlayers : undefined}
        teamBPlayers={teamBPlayers.length ? teamBPlayers : undefined}
        scoreA={isDone ? (match.scoreA ?? 0) : localScoreA}
        scoreB={isDone ? (match.scoreB ?? 0) : localScoreB}
        maxScore={maxScore}
        disabled={!canScore}
        onScoreAChange={setLocalScoreA}
        onScoreBChange={setLocalScoreB}
        className={cn(isPending && "opacity-60")}
      />

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
            disabled={busy}
            onClick={() => onFinalize({ scoreA: localScoreA, scoreB: localScoreB })}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finalize score
          </Button>
        </div>
      ) : null}

      {isDone ? (
        <p className="mt-3 text-center text-xs text-cp-muted sm:text-left">
          Final score recorded.
        </p>
      ) : null}
    </article>
  );
}
