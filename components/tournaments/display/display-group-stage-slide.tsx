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
  const groupMatches = useMemo(
    () =>
      (liveData.matches ?? []).filter(
        (m) => m.type === "group_stage" && m.teamAName && m.teamBName,
      ),
    [liveData.matches],
  );

  const groupLive = useMemo(
    () =>
      groupMatches.filter((m) =>
        isMatchLiveForTournament(m.status ?? "pending", liveData.tournament.status),
      ),
    [groupMatches, liveData.tournament.status],
  );

  const sortedCourts = useMemo(
    () => [...courts].sort((a, b) => (a.sortOrder ?? a.courtNumber) - (b.sortOrder ?? b.courtNumber)),
    [courts],
  );

  const cards = useMemo(() => {
    // Prefer live courts, then any assigned court fixtures, then remaining group matches.
    const preferred =
      groupLive.length > 0
        ? groupLive
        : groupMatches.filter((m) => m.status !== "completed").length > 0
          ? groupMatches.filter((m) => m.status !== "completed")
          : groupMatches;

    const byCourt = new Map(
      preferred.filter((m) => m.courtId).map((m) => [m.courtId as string, m]),
    );
    const ordered = sortedCourts
      .map((court) => {
        const m = byCourt.get(court.id);
        if (!m) return null;
        return { court, match: m };
      })
      .filter(Boolean) as Array<{
      court: (typeof sortedCourts)[number];
      match: (typeof groupMatches)[number];
    }>;

    if (ordered.length > 0) return ordered;
    return preferred.map((match, index) => ({
      court: {
        id: match.courtId ?? match.id,
        name: resolveCourtLabel(match.courtId, courts, index),
        courtNumber: index + 1,
        sortOrder: index,
        activeMatchId: match.id,
      },
      match,
    }));
  }, [courts, groupLive, groupMatches, sortedCourts]);

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
          ) : cards.length > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-white/75">{cards.length} on board</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden sm:mt-4">
        {cards.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
            Group fixtures appear here once pools are generated — live or finished matches stay on
            this board.
          </p>
        ) : (
          <MultiCourtDisplayGrid
            tournamentName={tournamentName}
            courtCount={cards.length}
            liveCount={groupLive.length || cards.length}
          >
            {cards.map(({ court, match: m }) => {
              const gamesMode = resolveGamesDisplayMode(liveData.scoring, m);
              const matchActive = isMatchLiveForTournament(
                m.status ?? "pending",
                liveData.tournament.status,
              );
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
                  matchActive={matchActive}
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
