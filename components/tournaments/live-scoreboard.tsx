"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LiveScoreboardProps = {
  teamAName: string;
  teamBName: string;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA: number;
  scoreB: number;
  onScoreAChange: (next: number) => void;
  onScoreBChange: (next: number) => void;
  maxScore?: number;
  disabled?: boolean;
  status?: "idle" | "syncing" | "saved" | "error";
  statusText?: string;
  className?: string;
  variant?: "default" | "compact";
};

function ScoreColumn({
  label,
  score,
  onChange,
  maxScore,
  disabled,
}: {
  label: string;
  score: number;
  onChange: (n: number) => void;
  maxScore: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <p className="max-w-full truncate text-center text-xs font-medium text-cp-muted sm:text-sm">
        {label}
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 rounded-full border-cp-border sm:h-12 sm:w-12"
          disabled={disabled || score <= 0}
          onClick={() => onChange(Math.max(0, score - 1))}
          aria-label={`Decrease ${label} score`}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <span className="min-w-[3rem] text-center text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
          {score}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 rounded-full border-cp-border sm:h-12 sm:w-12"
          disabled={disabled || score >= maxScore}
          onClick={() => onChange(Math.min(maxScore, score + 1))}
          aria-label={`Increase ${label} score`}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function CompactScoreRow({
  label,
  players,
  score,
  onChange,
  maxScore,
  disabled,
}: {
  label: string;
  players?: string[];
  score: number;
  onChange: (n: number) => void;
  maxScore: number;
  disabled?: boolean;
}) {
  const playerLine = players?.length ? players.join(" / ") : null;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-cp-border/80 bg-cp-elevated/30 px-2 py-2 sm:gap-3 sm:px-3">
      <div className="min-w-0 flex-1">
        <p
          className="break-words text-xs font-semibold leading-snug text-foreground sm:text-sm"
          title={label}
        >
          {label}
        </p>
        {playerLine ? (
          <p className="mt-0.5 break-words text-[10px] leading-snug text-cp-muted sm:text-[11px]">
            {playerLine}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full border-cp-border"
          disabled={disabled || score <= 0}
          onClick={() => onChange(Math.max(0, score - 1))}
          aria-label={`Decrease ${label} score`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-2xl font-bold tabular-nums text-foreground sm:w-10 sm:text-3xl">
          {score}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full border-cp-border"
          disabled={disabled || score >= maxScore}
          onClick={() => onChange(Math.min(maxScore, score + 1))}
          aria-label={`Increase ${label} score`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Touch-friendly live scoreboard for courtside use (mobile/tablet). */
export function LiveScoreboard({
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  scoreA,
  scoreB,
  onScoreAChange,
  onScoreBChange,
  maxScore = 99,
  disabled,
  status = "idle",
  statusText,
  className,
  variant = "default",
}: LiveScoreboardProps) {
  const resolvedStatusText =
    statusText ??
    (status === "syncing"
      ? "Syncing score..."
      : status === "saved"
        ? "Score synced"
        : status === "error"
          ? "Could not sync score"
          : null);

  return (
    <div className={className}>
      {variant === "compact" ? (
        <div className="space-y-2">
          <CompactScoreRow
            label={teamAName}
            players={teamAPlayers}
            score={scoreA}
            onChange={onScoreAChange}
            maxScore={maxScore}
            disabled={disabled}
          />
          <CompactScoreRow
            label={teamBName}
            players={teamBPlayers}
            score={scoreB}
            onChange={onScoreBChange}
            maxScore={maxScore}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-cp-border bg-cp-card/80 p-4 sm:gap-6 sm:p-6">
          <ScoreColumn
            label={teamAName}
            score={scoreA}
            onChange={onScoreAChange}
            maxScore={maxScore}
            disabled={disabled}
          />
          <span className="pb-6 text-2xl font-light text-cp-muted">:</span>
          <ScoreColumn
            label={teamBName}
            score={scoreB}
            onChange={onScoreBChange}
            maxScore={maxScore}
            disabled={disabled}
          />
        </div>
      )}
      {resolvedStatusText ? (
        <p
          className={cn(
            "mt-2 text-center text-xs font-medium",
            status === "error"
              ? "text-red-300"
              : status === "syncing"
                ? "text-amber-300"
                : "text-cp-muted",
          )}
          aria-live="polite"
        >
          {resolvedStatusText}
        </p>
      ) : null}
    </div>
  );
}

/** Fullscreen TV/monitor scoreboard — read-only display. */
export function LiveScoreboardDisplay({
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  subtitle,
  className,
}: {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-white",
        className,
      )}
    >
      {subtitle ? (
        <p className="mb-6 text-center text-sm uppercase tracking-[0.2em] text-white/60 sm:text-base">
          {subtitle}
        </p>
      ) : null}
      <div className="grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <div className="text-center">
          <p className="mb-4 line-clamp-2 text-lg font-medium text-white/80 sm:text-2xl">
            {teamAName}
          </p>
          <p className="text-7xl font-bold tabular-nums sm:text-8xl md:text-9xl">{scoreA}</p>
        </div>
        <span className="text-4xl font-light text-white/40 sm:text-6xl">:</span>
        <div className="text-center">
          <p className="mb-4 line-clamp-2 text-lg font-medium text-white/80 sm:text-2xl">
            {teamBName}
          </p>
          <p className="text-7xl font-bold tabular-nums sm:text-8xl md:text-9xl">{scoreB}</p>
        </div>
      </div>
    </div>
  );
}
