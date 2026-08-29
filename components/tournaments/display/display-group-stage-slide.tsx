"use client";

import { useMemo } from "react";
import {
  MultiCourtDisplayCard,
  MultiCourtDisplayGrid,
} from "@/components/tournaments/display-multi-court-grid";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import { resolveGamesDisplayMode } from "@/lib/tournaments/live/display-scoring";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { cn } from "@/lib/utils";

type DisplayGroupStageSlideProps = {
  tournamentName: string;
  liveData: Pick<TournamentLivePayload, "matches" | "courts" | "scoring" | "tournament">;
  className?: string;
};

/**
 * Venue TV group-stage slide — live pool matches on all courts (same card style as multi-court).
 */
export function DisplayGroupStageSlide({
  tournamentName,
  liveData,
  className,
}: DisplayGroupStageSlideProps) {
  const courts = liveData.courts ?? [];
  const groupLive = useMemo(
    () =>
      (liveData.matches ?? []).filter(
        (m) =>
          m.type === "group_stage" &&
          isMatchLiveForTournament(m.status ?? "pending", liveData.tournament.status) &&
          m.teamAName &&
          m.teamBName,
      ),
    [liveData.matches, liveData.tournament.status],
  );

  const sortedCourts = useMemo(
    () => [...courts].sort((a, b) => (a.sortOrder ?? a.courtNumber) - (b.sortOrder ?? b.courtNumber)),
    [courts],
  );

  const cards = useMemo(() => {
    const byCourt = new Map(groupLive.map((m) => [m.courtId ?? m.id, m]));
    const ordered = sortedCourts
      .map((court) => {
        const m = byCourt.get(court.id);
        if (!m) return null;
        return { court, match: m };
      })
      .filter(Boolean) as Array<{
      court: (typeof sortedCourts)[number];
      match: (typeof groupLive)[number];
    }>;

    if (ordered.length > 0) return ordered;
    return groupLive.map((match, index) => ({
      court: {
        id: match.courtId ?? match.id,
        name: resolveCourtLabel(match.courtId, courts, index),
        courtNumber: index + 1,
        sortOrder: index,
        activeMatchId: match.id,
      },
      match,
    }));
  }, [courts, groupLive, sortedCourts]);

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
          Group stage
          {groupLive.length > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-white/75">{groupLive.length} live</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden sm:mt-4">
        {cards.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
            No live group matches — scores appear here when pool play starts on court.
          </p>
        ) : (
          <MultiCourtDisplayGrid
            tournamentName={tournamentName}
            courtCount={cards.length}
            liveCount={groupLive.length}
          >
            {cards.map(({ court, match: m }) => {
              const gamesMode = resolveGamesDisplayMode(liveData.scoring, m);
              return (
                <MultiCourtDisplayCard
                  key={m.id}
                  courtName={court.name}
                  teamAName={m.teamAName!}
                  teamBName={m.teamBName!}
                  teamAPlayers={m.teamAPlayers}
                  teamBPlayers={m.teamBPlayers}
                  scoreA={m.scoreA ?? 0}
                  scoreB={m.scoreB ?? 0}
                  startedAt={m.startedAt}
                  timerEndsAt={m.timerEndsAt}
                  estimatedDurationMinutes={liveData.scoring?.roundDurationMinutes ?? null}
                  matchActive
                  scorekeeperName={m.scorekeeperName}
                  gamesMode={gamesMode}
                />
              );
            })}
          </MultiCourtDisplayGrid>
        )}
      </div>
    </div>
  );
}
