"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DoubleStageStandingsLegend,
  DoubleStageStandingsTable,
} from "@/components/tournaments/double-stage/double-stage-standings-table";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import {
  GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE,
  GROUP_STAGE_DISPLAY_SLIDE_MS,
  chunkGroupsForDisplay,
} from "@/lib/tournaments/display/group-stage-display";
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
 * Venue TV group-stage slide — paginated pool standings (4 groups per slide, auto-rotate).
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

  const slides = useMemo(
    () => chunkGroupsForDisplay(groups, GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE),
    [groups],
  );
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [groups.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, GROUP_STAGE_DISPLAY_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const safeSlideIndex = slides.length ? slideIndex % slides.length : 0;
  const currentSlide = slides[safeSlideIndex] ?? [];
  const slideLabel =
    slides.length <= 1
      ? null
      : `${currentSlide.map((g) => g.name).join(" · ")} (${safeSlideIndex + 1}/${slides.length})`;

  const denseSlide =
    currentSlide.some((g) => g.standings.length > 4) ||
    currentSlide.reduce((max, g) => Math.max(max, g.standings.length), 0) >= 5;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4",
        className,
      )}
    >
      <header className="shrink-0 border-b border-white/10 pb-2 sm:pb-2.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
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
              {slideLabel ? (
                <>
                  {" · "}
                  <span className="text-white/45">{slideLabel}</span>
                </>
              ) : null}
            </p>
          </div>
          {slides.length > 1 ? (
            <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === safeSlideIndex ? "w-5 bg-emerald-400" : "w-1.5 bg-white/25",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="mt-2 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 sm:px-3">
        <DoubleStageStandingsLegend
          scoreDisplay={scoreDisplay}
          showGameWinPct={showGameWinPct}
          className="flex-row gap-x-3 gap-y-0.5 text-[9px] text-white/45 sm:text-[10px] [&_span.font-semibold]:text-white/70"
        />
      </div>

      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden sm:mt-3">
        {groups.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
            Pool standings appear here once groups are generated and matches are recorded.
          </p>
        ) : (
          <div
            key={safeSlideIndex}
            className="grid h-full min-h-0 animate-in fade-in duration-700 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 sm:grid-rows-2"
          >
            {currentSlide.map((group) => {
              const liveInGroup = liveByGroupId.get(group.id) ?? [];
              return (
                <GroupPoolCard
                  key={group.id}
                  group={group}
                  liveInGroup={liveInGroup}
                  courts={courts}
                  scoreDisplay={scoreDisplay}
                  showGameWinPct={showGameWinPct}
                  dense={denseSlide}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupPoolCard({
  group,
  liveInGroup,
  courts,
  scoreDisplay,
  showGameWinPct,
  dense,
}: {
  group: GroupOverview;
  liveInGroup: NonNullable<TournamentLivePayload["matches"]>[number][];
  courts: NonNullable<TournamentLivePayload["courts"]>;
  scoreDisplay: "diff" | "games" | "sets";
  showGameWinPct: boolean;
  dense: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2">
        <h2 className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
          {group.name}
        </h2>
        {liveInGroup.length > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200 sm:text-[10px]">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            {liveInGroup.length} live
          </span>
        ) : null}
      </div>
      <div className={cn("min-h-0 flex-1 p-1.5 sm:p-2", dense && "p-1 sm:p-1.5")}>
        <DoubleStageStandingsTable
          group={group}
          compact={dense}
          displayMode
          scoreDisplay={scoreDisplay}
          showGameWinPct={showGameWinPct}
        />
      </div>
      {liveInGroup.length > 0 ? (
        <ul className="shrink-0 space-y-1 border-t border-emerald-500/20 bg-emerald-500/[0.08] p-2">
          {liveInGroup.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 text-[10px] text-white/90 sm:text-xs"
            >
              <span className="min-w-0 flex-1 leading-snug">
                <span className="font-semibold">{m.teamAName}</span>
                <span className="mx-1 font-normal text-white/40">vs</span>
                <span className="font-semibold">{m.teamBName}</span>
              </span>
              <span className="shrink-0 text-right font-mono tabular-nums text-emerald-100">
                {m.scoreA ?? 0}–{m.scoreB ?? 0}
                {m.courtId ? (
                  <span className="ml-1.5 text-[9px] font-sans text-white/45">
                    {resolveCourtLabel(m.courtId, courts)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
