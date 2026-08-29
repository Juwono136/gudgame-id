"use client";

import { useMemo } from "react";
import {
  DoubleStageStandingsLegend,
  DoubleStageStandingsTable,
} from "@/components/tournaments/double-stage/double-stage-standings-table";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import { cn } from "@/lib/utils";

type DisplayGroupStageSlideProps = {
  tournamentName: string;
  liveData: Pick<
    TournamentLivePayload,
    "matches" | "courts" | "scoring" | "tournament" | "doubleStage"
  >;
  scoreDisplay?: "diff" | "games" | "sets";
  showGameWinPct?: boolean;
  className?: string;
};

/**
 * Venue TV group-stage slide — live pool standings (not multi-court grid).
 */
export function DisplayGroupStageSlide({
  tournamentName,
  liveData,
  scoreDisplay = "games",
  showGameWinPct = false,
  className,
}: DisplayGroupStageSlideProps) {
  const courts = liveData.courts ?? [];
  const groups = (liveData.doubleStage?.groups ?? []) as GroupOverview[];

  const liveByGroupId = useMemo(() => {
    const map = new Map<string, NonNullable<TournamentLivePayload["matches"]>[number][]>();
    for (const m of liveData.matches ?? []) {
      if (m.type !== "group_stage" || !m.groupId) continue;
      if (
        !isMatchLiveForTournament(m.status ?? "pending", liveData.tournament.status)
      ) {
        continue;
      }
      const list = map.get(m.groupId) ?? [];
      list.push(m);
      map.set(m.groupId, list);
    }
    return map;
  }, [liveData.matches, liveData.tournament.status]);

  const liveCount = useMemo(
    () =>
      (liveData.matches ?? []).filter(
        (m) =>
          m.type === "group_stage" &&
          isMatchLiveForTournament(m.status ?? "pending", liveData.tournament.status),
      ).length,
    [liveData.matches, liveData.tournament.status],
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
          Group stage · pool standings
          {liveCount > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-emerald-300">{liveCount} live</span>
            </>
          ) : groups.length > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-white/75">{groups.length} pools</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-2 shrink-0">
        <DoubleStageStandingsLegend
          scoreDisplay={scoreDisplay}
          showGameWinPct={showGameWinPct}
          className="text-white/50 [&_span.font-semibold]:text-white/80"
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto sm:mt-4">
        {groups.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
            Pool standings appear here once groups are generated and matches are recorded.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {groups.map((group) => {
              const liveInGroup = liveByGroupId.get(group.id) ?? [];
              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                >
                  <div className="border-b border-white/10 bg-white/[0.06] px-3 py-2 sm:px-4">
                    <h2 className="text-sm font-semibold text-white sm:text-base">
                      {group.name}
                    </h2>
                    {liveInGroup.length > 0 ? (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        {liveInGroup.length} live
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2 p-2 sm:p-3">
                    <DoubleStageStandingsTable
                      group={group}
                      compact
                      scoreDisplay={scoreDisplay}
                      showGameWinPct={showGameWinPct}
                    />
                    {liveInGroup.length > 0 ? (
                      <ul className="space-y-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2">
                        {liveInGroup.map((m) => (
                          <li
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/90"
                          >
                            <span className="min-w-0 truncate font-medium">
                              {m.teamAName}{" "}
                              <span className="font-normal text-white/50">vs</span>{" "}
                              {m.teamBName}
                            </span>
                            <span className="shrink-0 font-mono tabular-nums">
                              {m.scoreA ?? 0}–{m.scoreB ?? 0}
                              {m.courtId ? (
                                <span className="ml-2 text-[10px] text-white/50">
                                  {resolveCourtLabel(m.courtId, courts)}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
