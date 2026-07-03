"use client";

import { cn } from "@/lib/utils";
import {
  getMatchScorePhase,
  isMatchComplete,
  type ScoringRules,
} from "@/lib/tournaments/scoring/engine";

type DeuceScoreBadgeProps = {
  scoreA: number;
  scoreB: number;
  rules: ScoringRules;
  className?: string;
};

export function DeuceScoreBadge({ scoreA, scoreB, rules, className }: DeuceScoreBadgeProps) {
  const phase = getMatchScorePhase(scoreA, scoreB, rules);
  const completion = isMatchComplete(scoreA, scoreB, rules);

  if (completion.complete) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300",
          className,
        )}
      >
        Match point won
      </span>
    );
  }

  if (phase === "cap") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300",
          className,
        )}
      >
        Score cap
      </span>
    );
  }

  if (phase === "deuce") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300",
          className,
        )}
      >
        Deuce · win by {rules.deuceConfig.winBy}
      </span>
    );
  }

  if (phase === "match_point") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300",
          className,
        )}
      >
        Match point
      </span>
    );
  }

  if (!rules.deuceConfig.deuceEnabled) return null;

  return (
    <span className={cn("text-[10px] text-cp-muted", className)}>
      First to {rules.pointsPerMatch}
      {rules.deuceConfig.deuceEnabled
        ? ` · deuce from ${rules.deuceConfig.deuceThreshold}`
        : ""}
    </span>
  );
}
