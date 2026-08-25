"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import { uniquePlayerNames } from "@/lib/format/player-names";
import type { ScoreAdjustOptions } from "@/lib/tournaments/scoring/match-score-events";
import { cn } from "@/lib/utils";

export type { ScoreAdjustOptions };

type LiveScoreboardProps = {
  teamAName: string;
  teamBName: string;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA: number;
  scoreB: number;
  onScoreAChange: (next: number, options?: ScoreAdjustOptions) => void;
  onScoreBChange: (next: number, options?: ScoreAdjustOptions) => void;
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
  onChange: (n: number, options?: ScoreAdjustOptions) => void;
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
  onChange: (n: number, options?: ScoreAdjustOptions) => void;
  maxScore: number;
  disabled?: boolean;
}) {
  const playerList = uniquePlayerNames(players);
  const singlePlayer = playerList.length === 1 ? playerList[0]! : null;
  const usePlayerButtons = playerList.length > 1;

  const increment = (options?: ScoreAdjustOptions) => {
    if (score >= maxScore) return;
    onChange(Math.min(maxScore, score + 1), options);
  };

  return (
    <div className="rounded-xl border border-cp-border/80 bg-cp-elevated/30 px-2 py-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="break-words text-xs font-semibold leading-snug text-foreground sm:text-sm"
            title={label}
          >
            {label}
          </p>
          {playerList.length > 0 && !usePlayerButtons ? (
            <TeamPlayerList names={playerList} maxNames={3} compact />
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
          {!usePlayerButtons ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-full border-cp-border"
              disabled={disabled || score >= maxScore}
              onClick={() => increment(singlePlayer ? { scorerName: singlePlayer } : undefined)}
              aria-label={`Increase ${label} score`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <span className="w-9 shrink-0 sm:w-10" aria-hidden />
          )}
        </div>
      </div>
      {usePlayerButtons ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {playerList.map((playerName) => (
            <Button
              key={playerName}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 max-w-full truncate rounded-full border-cp-primary/30 px-2.5 text-[11px] font-medium text-foreground hover:bg-cp-primary/10"
              disabled={disabled || score >= maxScore}
              onClick={() => increment({ scorerName: playerName })}
              aria-label={`Award point to ${playerName}`}
            >
              <Plus className="mr-1 h-3 w-3 shrink-0 text-cp-primary" />
              <span className="truncate">{playerName}</span>
            </Button>
          ))}
        </div>
      ) : null}
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
        "flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden px-4 py-4 text-white sm:px-8 sm:py-6",
        className,
      )}
    >
      {subtitle ? (
        <p className="mb-4 max-w-4xl truncate text-center text-xs uppercase tracking-[0.18em] text-white/55 sm:mb-6 sm:text-sm">
          {subtitle}
        </p>
      ) : null}
      <div className="grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 lg:gap-8">
        <div className="min-w-0 text-center">
          <p className="mb-2 line-clamp-2 text-base font-medium text-white/80 sm:mb-4 sm:text-xl lg:text-2xl">
            {teamAName}
          </p>
          <p className="text-[clamp(2.75rem,12vh,6.5rem)] font-bold tabular-nums leading-none">
            {scoreA}
          </p>
        </div>
        <span className="text-3xl font-light text-white/35 sm:text-5xl">:</span>
        <div className="min-w-0 text-center">
          <p className="mb-2 line-clamp-2 text-base font-medium text-white/80 sm:mb-4 sm:text-xl lg:text-2xl">
            {teamBName}
          </p>
          <p className="text-[clamp(2.75rem,12vh,6.5rem)] font-bold tabular-nums leading-none">
            {scoreB}
          </p>
        </div>
      </div>
    </div>
  );
}
