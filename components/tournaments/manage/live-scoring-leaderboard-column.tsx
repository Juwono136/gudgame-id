"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type LiveScoringLeaderboardColumnProps = {
  title?: string;
  subtitle?: string;
  /** One-line hint under headers — prefer tooltips on columns over long footers. */
  hint?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Leaderboard column for manage Live scoring.
 * No internal max-height scroll on desktop — page scroll is the single vertical axis.
 */
export function LiveScoringLeaderboardColumn({
  title = "Leaderboard",
  subtitle,
  hint,
  headerAction,
  children,
  className,
}: LiveScoringLeaderboardColumnProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-cp-border bg-cp-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-cp-border px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-cp-muted">{subtitle}</p>
          ) : null}
          {hint ? (
            <p className="mt-0.5 hidden text-[10px] text-cp-muted/80 sm:block">{hint}</p>
          ) : null}
        </div>
        {headerAction}
      </header>
      <div className="px-2 py-2 sm:px-3 sm:py-3">{children}</div>
    </section>
  );
}
