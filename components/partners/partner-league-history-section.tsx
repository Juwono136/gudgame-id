"use client";

import { PartnerLeagueMatchesPanel } from "@/components/partners/partner-league-matches-panel";
import { Button } from "@/components/ui/button";
import type { PartnerLeagueMatchView } from "@/lib/partners/league-types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

type PartnerLeagueHistorySectionProps = {
  matches: PartnerLeagueMatchView[];
  /** Public: show completed-first history. Dashboard: all matches + score actions. */
  mode: "public" | "dashboard";
  onNewMatch?: () => void;
  canCreateMatch?: boolean;
  onEditScore?: (match: PartnerLeagueMatchView) => void;
  className?: string;
};

/**
 * League match history — mirrors a typical sports league results/fixtures block.
 */
export function PartnerLeagueHistorySection({
  matches,
  mode,
  onNewMatch,
  canCreateMatch = false,
  onEditScore,
  className,
}: PartnerLeagueHistorySectionProps) {
  const completedCount = matches.filter((m) => m.status === "completed").length;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            {mode === "public" ? "History" : "Matches"}
          </h2>
          <p className="mt-0.5 text-xs text-cp-muted sm:text-sm">
            {mode === "public"
              ? completedCount
                ? `${completedCount} completed result${completedCount === 1 ? "" : "s"}`
                : "Completed fixtures and results for this league"
              : "Optional fixtures for the standings table"}
          </p>
        </div>
        {mode === "dashboard" && onNewMatch ? (
          <Button
            type="button"
            size="sm"
            className="bg-cp-primary hover:bg-cp-primary-light"
            onClick={onNewMatch}
            disabled={!canCreateMatch}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New match
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-cp-border bg-cp-card p-4 shadow-sm sm:p-5">
        <PartnerLeagueMatchesPanel
          matches={matches}
          defaultStatus={mode === "public" ? "completed" : "all"}
          onEditScore={mode === "dashboard" ? onEditScore : undefined}
        />
      </div>
    </section>
  );
}
