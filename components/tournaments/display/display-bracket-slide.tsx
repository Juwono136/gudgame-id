"use client";

import { useMemo } from "react";
import { BracketTreeView } from "@/components/tournaments/bracket-tree-view";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import { cn } from "@/lib/utils";

type DisplayBracketSlideProps = {
  tournamentName: string;
  matches: BracketMatchView[];
  tournamentStatus?: string | null;
  className?: string;
};

/**
 * Venue TV knockout slide — real bracket tree (same data as public page),
 * locked to one viewport without page scroll.
 */
export function DisplayBracketSlide({
  tournamentName,
  matches,
  tournamentStatus,
  className,
}: DisplayBracketSlideProps) {
  const liveCount = useMemo(
    () =>
      matches.filter((m) =>
        isMatchLiveForTournament(m.status ?? "pending", tournamentStatus),
      ).length,
    [matches, tournamentStatus],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4",
        className,
      )}
    >
      <header className="shrink-0 border-b border-white/10 pb-2.5 sm:pb-3">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
          {tournamentName}
        </h1>
        <p className="mt-0.5 text-xs text-white/55 sm:text-sm">
          Bracket
          {matches.length > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-white/75">{liveCount} live</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0a1210] p-2 sm:mt-4 sm:p-3 [&_.rounded-xl]:border-white/15 [&_.bg-cp-card]:bg-[#0f1a17] [&_.bg-cp-elevated]:bg-[#12201c] [&_.text-foreground]:text-white [&_.text-cp-muted]:text-white/50">
        <div className="h-full min-h-0 overflow-auto overscroll-contain">
          <BracketTreeView
            matches={matches}
            showEmptySlots={false}
            emptyMessage="Bracket matches will appear here once generated."
          />
        </div>
      </div>
    </div>
  );
}
