"use client";

import { useEffect, useRef } from "react";
import { Check, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type MatchRoundTabItem = {
  roundNumber: number;
  /** Short label inside the tab (e.g. "1" or "1·M2"). */
  label: string;
  liveCount: number;
  completedCount: number;
  matchCount: number;
  isComplete: boolean;
};

type MatchRoundTabsProps = {
  rounds: MatchRoundTabItem[];
  selectedRound: number;
  activeRound: number;
  onSelect: (roundNumber: number) => void;
  className?: string;
  accentVariant?: "fun" | "official";
};

export function MatchRoundTabs({
  rounds,
  selectedRound,
  activeRound,
  onSelect,
  className,
  accentVariant = "fun",
}: MatchRoundTabsProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedRound]);

  if (!rounds.length) return null;

  const activeAccent =
    accentVariant === "official"
      ? "bg-cp-primary text-cp-primary-foreground border-cp-primary shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
      : "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="tablist"
        aria-label="Match rounds"
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cp-border"
      >
        {rounds.map((round) => {
          const selected = round.roundNumber === selectedRound;
          const isActiveRound = round.roundNumber === activeRound && round.liveCount > 0;
          return (
            <button
              key={round.roundNumber}
              ref={selected ? selectedRef : undefined}
              type="button"
              role="tab"
              aria-selected={selected}
              title={
                isActiveRound
                  ? `Round ${round.label} · Active`
                  : round.isComplete
                    ? `Round ${round.label} · Completed`
                    : `Round ${round.label}`
              }
              onClick={() => onSelect(round.roundNumber)}
              className={cn(
                "relative flex h-11 min-w-[2.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 text-sm font-bold tabular-nums transition-all duration-200",
                selected
                  ? activeAccent
                  : "border-cp-border bg-cp-elevated/40 text-cp-muted hover:border-cp-border/80 hover:bg-cp-elevated/70 hover:text-foreground",
                isActiveRound && !selected && "border-amber-500/50 text-amber-300",
              )}
            >
              <span className="inline-flex items-center gap-1 leading-none">
                {round.label}
                {round.isComplete && !isActiveRound ? (
                  <Check
                    className={cn(
                      "h-3 w-3 shrink-0",
                      selected ? "text-white/95" : "text-emerald-400",
                    )}
                    strokeWidth={3}
                    aria-label="Completed"
                  />
                ) : null}
              </span>
              {isActiveRound ? (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide",
                    selected ? "text-white/90" : "text-amber-400",
                  )}
                >
                  <Radio className="h-2.5 w-2.5 animate-pulse" aria-hidden />
                  Live
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {rounds.length > 6 ? (
        <p className="text-[11px] text-cp-muted">Scroll sideways for more rounds</p>
      ) : null}
    </div>
  );
}
