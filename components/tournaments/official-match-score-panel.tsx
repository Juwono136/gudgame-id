"use client";

import { Minus, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OfficialMatchScorePanelProps = {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  onScoreAChange: (next: number) => void;
  onScoreBChange: (next: number) => void;
  roundNumber?: number;
  matchNumber?: number;
  targetPoints?: number;
  disabled?: boolean;
  status?: "idle" | "syncing" | "saved" | "error";
  onFinalize?: () => void;
  finalizePending?: boolean;
  className?: string;
};

function ScoreSide({
  label,
  score,
  onChange,
  targetPoints,
  disabled,
  align,
}: {
  label: string;
  score: number;
  onChange: (n: number) => void;
  targetPoints: number;
  disabled?: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-3",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <p className="max-w-full truncate text-xs font-semibold uppercase tracking-wider text-cp-muted sm:text-sm">
        {label}
      </p>
      <div
        className={cn(
          "flex items-center gap-2 sm:gap-3",
          align === "right" ? "flex-row-reverse" : "flex-row",
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-12 w-12 shrink-0 rounded-xl border-cp-border bg-cp-elevated/50 sm:h-14 sm:w-14"
          disabled={disabled || score <= 0}
          onClick={() => onChange(Math.max(0, score - 1))}
          aria-label={`Decrease ${label} score`}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <div
          className={cn(
            "flex min-w-[4.5rem] flex-col items-center rounded-2xl border border-cp-primary/20 bg-cp-bg/80 px-4 py-3 sm:min-w-[5.5rem] sm:px-5",
            score >= targetPoints ? "border-emerald-500/40 bg-emerald-950/20" : "",
          )}
        >
          <span className="text-5xl font-bold tabular-nums text-foreground sm:text-6xl">{score}</span>
          {score >= targetPoints ? (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Target reached
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-12 w-12 shrink-0 rounded-xl border-cp-border bg-cp-elevated/50 sm:h-14 sm:w-14"
          disabled={disabled || score >= targetPoints}
          onClick={() => onChange(Math.min(targetPoints, score + 1))}
          aria-label={`Increase ${label} score`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/** Professional courtside score panel for official elimination tournaments. */
export function OfficialMatchScorePanel({
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  onScoreAChange,
  onScoreBChange,
  roundNumber,
  matchNumber,
  targetPoints = 21,
  disabled,
  status = "idle",
  onFinalize,
  finalizePending,
  className,
}: OfficialMatchScorePanelProps) {
  const statusLabel =
    status === "syncing"
      ? "Saving score…"
      : status === "saved"
        ? "Score saved"
        : status === "error"
          ? "Could not save — try again"
          : null;

  const matchLabel =
    roundNumber != null
      ? `Round ${roundNumber}${matchNumber != null ? ` · Match ${matchNumber}` : ""}`
      : matchNumber != null
        ? `Match ${matchNumber}`
        : null;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-cp-primary/25 bg-linear-to-b from-cp-card to-cp-bg/90", className)}>
      <div className="border-b border-cp-border/80 bg-cp-primary/8 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cp-primary">
              Official match scoring
            </p>
            {matchLabel ? (
              <p className="mt-1 text-sm font-medium text-foreground">{matchLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" className="border-0 text-[10px] uppercase">
              Target {targetPoints} pts
            </Badge>
            <Badge variant="success" className="border-0 text-[10px] uppercase">
              Live
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:justify-between">
          <ScoreSide
            label={teamAName}
            score={scoreA}
            onChange={onScoreAChange}
            targetPoints={targetPoints}
            disabled={disabled}
            align="left"
          />
          <div className="hidden shrink-0 px-2 text-3xl font-light text-cp-muted sm:block">vs</div>
          <ScoreSide
            label={teamBName}
            score={scoreB}
            onChange={onScoreBChange}
            targetPoints={targetPoints}
            disabled={disabled}
            align="right"
          />
        </div>

        {statusLabel ? (
          <p
            className={cn(
              "mt-4 text-center text-xs font-medium",
              status === "error"
                ? "text-red-300"
                : status === "syncing"
                  ? "text-amber-300"
                  : "text-cp-muted",
            )}
            aria-live="polite"
          >
            {statusLabel}
          </p>
        ) : null}

        <p className="mt-4 text-center text-xs leading-relaxed text-cp-muted">
          Tap +/− to update the live score. Finalize only when the match is complete — the winner
          advances in the bracket and player stats are recorded separately for paid and free official
          tiers.
        </p>

        {onFinalize ? (
          <Button
            type="button"
            className="mt-5 h-12 w-full bg-cp-primary text-base font-semibold hover:bg-cp-primary-light sm:w-auto sm:min-w-[240px]"
            disabled={disabled || finalizePending}
            onClick={onFinalize}
          >
            <Trophy className="mr-2 h-4 w-4" />
            {finalizePending ? "Finalizing…" : "Finalize match result"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
