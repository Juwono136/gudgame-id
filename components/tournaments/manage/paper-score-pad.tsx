"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PaperScorePadProps = {
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  /** Label under each score (games / sets / points). */
  unitLabel?: string;
  disabled?: boolean;
  onChange: (scoreA: number, scoreB: number) => void;
  className?: string;
  hint?: string;
};

/**
 * Touch-friendly paper / batch final score entry for field referees.
 * Writes absolute scores (action: set) — does not change scoring engine rules.
 */
export function PaperScorePad({
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  unitLabel = "score",
  disabled,
  onChange,
  className,
  hint = "Enter the final score, then tap Finish on the match.",
}: PaperScorePadProps) {
  const bump = (side: "a" | "b", delta: number) => {
    if (disabled) return;
    const nextA = side === "a" ? Math.max(0, scoreA + delta) : scoreA;
    const nextB = side === "b" ? Math.max(0, scoreB + delta) : scoreB;
    onChange(nextA, nextB);
  };

  return (
    <div
      className={cn(
        "w-full max-w-lg space-y-3 rounded-2xl border border-cp-border bg-cp-elevated/50 p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cp-primary">
          Paper score entry
        </p>
        <p className="text-[11px] text-cp-muted">Final {unitLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PaperSide
          name={teamAName}
          score={scoreA}
          unitLabel={unitLabel}
          disabled={disabled}
          onBump={(d) => bump("a", d)}
          onSet={(n) => onChange(n, scoreB)}
        />
        <PaperSide
          name={teamBName}
          score={scoreB}
          unitLabel={unitLabel}
          disabled={disabled}
          onBump={(d) => bump("b", d)}
          onSet={(n) => onChange(scoreA, n)}
        />
      </div>

      <p className="text-center text-[11px] leading-relaxed text-cp-muted">{hint}</p>
    </div>
  );
}

function PaperSide({
  name,
  score,
  unitLabel,
  disabled,
  onBump,
  onSet,
}: {
  name: string;
  score: number;
  unitLabel: string;
  disabled?: boolean;
  onBump: (delta: number) => void;
  onSet: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-cp-border bg-cp-card p-3">
      <Label className="w-full truncate text-center text-xs font-semibold text-foreground">
        {name}
      </Label>
      <p className="text-[10px] uppercase tracking-wide text-cp-muted">{unitLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 touch-manipulation rounded-full border-cp-border"
          disabled={disabled || score <= 0}
          onClick={() => onBump(-1)}
          aria-label={`Decrease ${name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          value={score}
          onChange={(e) => onSet(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
          className="h-14 w-20 border-cp-border bg-cp-bg text-center text-2xl font-bold tabular-nums"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 touch-manipulation rounded-full border-cp-border"
          disabled={disabled}
          onClick={() => onBump(1)}
          aria-label={`Increase ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
