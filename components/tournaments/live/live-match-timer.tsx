"use client";

import { useEffect, useState } from "react";
import { Clock, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export type LiveMatchTimerProps = {
  startedAt: string | null | undefined;
  /** Hard stop / countdown end (timed scoring). */
  timerEndsAt?: string | null;
  /**
   * Soft estimate in minutes when there is no timerEndsAt (race-to / sets).
   * Remaining is shown as "Est. left".
   */
  estimatedDurationMinutes?: number | null;
  active?: boolean;
  className?: string;
  compact?: boolean;
  /** Venue TV / dark scoreboards — mint on charcoal instead of app tokens. */
  tone?: "default" | "display";
};

/**
 * Live elapsed (+ remaining when known) for in-progress matches.
 */
export function LiveMatchTimer({
  startedAt,
  timerEndsAt = null,
  estimatedDurationMinutes = null,
  active = true,
  className,
  compact = false,
  tone = "default",
}: LiveMatchTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, startedAt]);

  if (!startedAt || !active) return null;

  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return null;

  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));

  let remainingSec: number | null = null;
  let remainingLabel = "Left";
  if (timerEndsAt) {
    const endMs = new Date(timerEndsAt).getTime();
    if (!Number.isNaN(endMs)) {
      remainingSec = Math.max(0, Math.floor((endMs - now) / 1000));
    }
  } else if (estimatedDurationMinutes != null && estimatedDurationMinutes > 0) {
    const budget = estimatedDurationMinutes * 60;
    remainingSec = Math.max(0, budget - elapsedSec);
    remainingLabel = "Est. left";
  }

  const timedOut = remainingSec === 0 && timerEndsAt != null;
  const progress =
    timerEndsAt && remainingSec != null
      ? (() => {
          const endMs = new Date(timerEndsAt).getTime();
          const total = Math.max(1, Math.floor((endMs - startMs) / 1000));
          return Math.min(100, ((total - remainingSec) / total) * 100);
        })()
      : estimatedDurationMinutes && remainingSec != null
        ? Math.min(
            100,
            (elapsedSec / Math.max(1, estimatedDurationMinutes * 60)) * 100,
          )
        : null;

  const isDisplay = tone === "display";
  const muted = isDisplay ? "text-white/45" : "text-cp-muted";
  const value = isDisplay ? "text-white" : "text-foreground";
  const accent = isDisplay ? "text-emerald-300" : "text-cp-primary";
  const iconWell = isDisplay
    ? "bg-emerald-500/20 text-emerald-300"
    : "bg-cp-primary/15 text-cp-primary";
  const iconWellMuted = isDisplay
    ? "bg-white/10 text-white/50"
    : "bg-cp-elevated text-cp-muted";
  const track = isDisplay ? "bg-white/10" : "bg-cp-elevated";
  const fill = timedOut ? "bg-amber-500" : isDisplay ? "bg-emerald-400" : "bg-cp-primary";

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-[11px] tabular-nums",
          isDisplay
            ? "border-emerald-500/25 bg-emerald-500/10"
            : "border-cp-border/80 bg-cp-elevated/40",
          className,
        )}
      >
        <Clock className={cn("h-3 w-3", accent)} aria-hidden />
        <span className={cn("font-semibold", value)}>{formatClock(elapsedSec)}</span>
        {remainingSec != null ? (
          <>
            <span className={muted}>·</span>
            <span className={cn(timedOut ? "font-semibold text-amber-400" : muted)}>
              {timedOut ? "Time up" : `${remainingLabel} ${formatClock(remainingSec)}`}
            </span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5",
        isDisplay
          ? "border border-emerald-500/25 bg-emerald-500/10"
          : "border border-cp-primary/20 bg-cp-primary/5",
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Match time ${formatClock(elapsedSec)}${
        remainingSec != null ? `, ${remainingLabel} ${formatClock(remainingSec)}` : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              iconWell,
            )}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                muted,
              )}
            >
              Elapsed
            </p>
            <p className={cn("text-sm font-bold tabular-nums", value)}>
              {formatClock(elapsedSec)}
            </p>
          </div>
        </div>
        {remainingSec != null ? (
          <div className="flex items-center gap-2 text-right">
            <div>
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  muted,
                )}
              >
                {remainingLabel}
              </p>
              <p
                className={cn(
                  "text-sm font-bold tabular-nums",
                  timedOut ? "text-amber-400" : value,
                )}
              >
                {timedOut ? "0:00" : formatClock(remainingSec)}
              </p>
            </div>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                iconWellMuted,
              )}
            >
              <Hourglass className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        ) : null}
      </div>
      {progress != null ? (
        <div className={cn("mt-2 h-1 overflow-hidden rounded-full", track)}>
          <div
            className={cn("h-full transition-all duration-500", fill)}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {timedOut ? (
        <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-amber-400">
          Time up
        </p>
      ) : null}
    </div>
  );
}
