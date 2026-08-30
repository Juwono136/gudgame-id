"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ListOrdered, MapPin, Radio } from "lucide-react";
import {
  buildDisplayOrderOfPlayBuckets,
  mapLiveToDisplayScheduleRows,
} from "@/lib/tournaments/double-stage/display-schedule-rows";
import { DisplayScheduleMatchCard } from "@/components/tournaments/display/display-schedule-match-card";
import {
  groupMatchesByCourt,
  groupMatchesByScheduleDay,
  type OrderOfPlayBucket,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import {
  MATCH_SCHEDULE_DEFAULT_PER_PAGE,
  MATCH_SCHEDULE_STRIP_DEFAULT,
  fitMatchScheduleColumnPerPage,
  fitMatchScheduleStripPerPage,
} from "@/lib/tournaments/display/fit-capacity";
import {
  MATCH_SCHEDULE_SLIDE_MS,
  chunkSchedulePages,
} from "@/lib/tournaments/display/match-schedule-display";
import { useDisplayFitCapacity } from "@/hooks/use-display-fit-capacity";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { cn } from "@/lib/utils";

type BoardView = "orderOfPlay" | "schedule" | "court";

type DisplayMatchScheduleSlideProps = {
  tournamentName: string;
  liveData: Pick<
    TournamentLivePayload,
    "matches" | "courts" | "bracket" | "tournament" | "doubleStage" | "scoring"
  >;
  className?: string;
};

const BUCKET_THEME: Record<
  OrderOfPlayBucket["key"],
  { accent: string; header: string; dot: string }
> = {
  now: {
    accent: "border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-amber-500/[0.06]",
    header: "text-amber-100",
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]",
  },
  next: {
    accent: "border-sky-400/35 bg-gradient-to-b from-sky-500/15 to-sky-500/[0.05]",
    header: "text-sky-100",
    dot: "bg-sky-400",
  },
  later: {
    accent: "border-white/12 bg-white/[0.04]",
    header: "text-white/80",
    dot: "bg-white/50",
  },
  done: {
    accent: "border-white/10 bg-black/25",
    header: "text-white/50",
    dot: "bg-white/30",
  },
};

function useBucketPageIndex(pageCount: number, resetKey: string | number) {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [resetKey, pageCount]);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = window.setInterval(() => {
      setPageIndex((prev) => (prev + 1) % pageCount);
    }, MATCH_SCHEDULE_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [pageCount]);

  return pageCount ? pageIndex % pageCount : 0;
}

function slideCardProps(visibleCount: number, perPage: number) {
  const packed = visibleCount >= Math.min(perPage, 3) && perPage >= 3;
  return {
    density: packed ? ("carousel" as const) : ("comfortable" as const),
    fillHeight: packed,
  };
}

export function DisplayMatchScheduleSlide({
  tournamentName,
  liveData,
  className,
}: DisplayMatchScheduleSlideProps) {
  const [view, setView] = useState<BoardView>("orderOfPlay");

  const rows = useMemo(() => mapLiveToDisplayScheduleRows(liveData), [liveData]);
  const buckets = useMemo(
    () => buildDisplayOrderOfPlayBuckets(liveData, { nextCapacity: 2 }),
    [liveData],
  );
  const days = useMemo(() => groupMatchesByScheduleDay(rows), [rows]);
  const courts = useMemo(() => groupMatchesByCourt(rows), [rows]);
  const tournamentLive = liveData.tournament.status === "live";
  const gamesScoreMode = liveData.scoring?.matchScoreMode === "games";

  const nowBucket = buckets.find((b) => b.key === "now");
  const nextBucket = buckets.find((b) => b.key === "next");
  const laterBucket = buckets.find((b) => b.key === "later");
  const doneBucket = buckets.find((b) => b.key === "done");

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden px-2 pb-2 pt-2 sm:px-4 sm:pb-3 sm:pt-3",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-2 sm:gap-3 sm:pb-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl lg:text-2xl">
            {tournamentName}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-white/55 sm:text-xs">
            <span>Match schedule</span>
            {rows.length > 0 ? (
              <span className="font-medium text-white/75">· {rows.length} fixtures</span>
            ) : null}
            {tournamentLive ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                <Radio className="size-3" aria-hidden />
                Session live
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["orderOfPlay", "Order of Play", ListOrdered],
              ["schedule", "By day", CalendarDays],
              ["court", "By court", MapPin],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                view === key
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                  : "border-white/15 bg-white/5 text-white/55 hover:border-white/30 hover:text-white/80",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-2 min-h-0 flex-1 overflow-hidden sm:mt-3">
        {rows.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
            Fixtures appear here once groups or the knockout bracket are generated.
          </p>
        ) : view === "orderOfPlay" ? (
          <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-2.5">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <BucketCarouselColumn
                bucket={nowBucket}
                gamesScoreMode={gamesScoreMode}
                tournamentLive={tournamentLive}
                emphasize
              />
              <BucketCarouselColumn bucket={nextBucket} gamesScoreMode={gamesScoreMode} />
              <BucketCarouselColumn bucket={laterBucket} gamesScoreMode={gamesScoreMode} />
            </div>
            {doneBucket && doneBucket.matches.length > 0 ? (
              <DoneCarouselStrip bucket={doneBucket} gamesScoreMode={gamesScoreMode} />
            ) : null}
          </div>
        ) : view === "schedule" ? (
          <AltViewBoard
            sections={days.map((day) => ({
              key: day.dateKey,
              label: day.label,
              matches: day.matches,
            }))}
            gamesScoreMode={gamesScoreMode}
          />
        ) : (
          <AltViewBoard
            sections={courts.map((court) => ({
              key: court.courtKey,
              label: court.label,
              matches: court.matches,
            }))}
            gamesScoreMode={gamesScoreMode}
            hideCourt
          />
        )}
      </div>
    </div>
  );
}

function BucketCarouselColumn({
  bucket,
  gamesScoreMode,
  tournamentLive = false,
  emphasize = false,
}: {
  bucket?: OrderOfPlayBucket;
  gamesScoreMode: boolean;
  tournamentLive?: boolean;
  emphasize?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const fitColumn = useCallback(
    (size: { width: number; height: number }) => fitMatchScheduleColumnPerPage(size.height),
    [],
  );
  const perPage = useDisplayFitCapacity(
    listRef,
    fitColumn,
    MATCH_SCHEDULE_DEFAULT_PER_PAGE,
  );

  const pages = useMemo(
    () => chunkSchedulePages(bucket?.matches ?? [], perPage),
    [bucket?.matches, perPage],
  );
  const pageIndex = useBucketPageIndex(
    pages.length,
    `${bucket?.key ?? "none"}-${bucket?.matches.length ?? 0}-${perPage}`,
  );

  if (!bucket) return null;

  const theme = BUCKET_THEME[bucket.key];
  const visible = pages[pageIndex] ?? [];
  const showIdleNow =
    bucket.key === "now" && bucket.matches.length === 0 && tournamentLive;
  const packed = visible.length >= Math.min(perPage, 3) && perPage >= 3;
  const cardProps = slideCardProps(visible.length, perPage);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border",
        theme.accent,
      )}
    >
      <BucketHeader bucket={bucket} theme={theme} pageIndex={pageIndex} pageCount={pages.length} />

      <div ref={listRef} className="min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2">
        {showIdleNow ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-amber-400/30 bg-amber-500/[0.08] px-3 py-5 text-center">
            <p className="text-sm font-semibold text-amber-50 sm:text-base">Courts ready</p>
            <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">
              Session is live — waiting for the next fixture on court.
            </p>
          </div>
        ) : bucket.matches.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-xs text-white/40 sm:text-sm">
            No fixtures in this slot.
          </p>
        ) : (
          <ul
            key={`${bucket.key}-${pageIndex}-${perPage}`}
            className={cn(
              "h-full min-h-0 animate-in fade-in duration-500",
              packed
                ? "grid gap-1.5 sm:gap-2"
                : "flex flex-col justify-center gap-2.5 sm:gap-3",
            )}
            style={
              packed
                ? { gridTemplateRows: `repeat(${visible.length}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {visible.map((m) => (
              <li key={`${m.kind}-${m.id}`} className="min-h-0">
                <DisplayScheduleMatchCard
                  match={m}
                  gamesScoreMode={gamesScoreMode}
                  emphasize={emphasize && bucket.key === "now"}
                  {...cardProps}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DoneCarouselStrip({
  bucket,
  gamesScoreMode,
}: {
  bucket: OrderOfPlayBucket;
  gamesScoreMode: boolean;
}) {
  const theme = BUCKET_THEME.done;
  const listRef = useRef<HTMLDivElement>(null);
  const fitStrip = useCallback(
    (size: { width: number; height: number }) => fitMatchScheduleStripPerPage(size.width),
    [],
  );
  const perPage = useDisplayFitCapacity(
    listRef,
    fitStrip,
    MATCH_SCHEDULE_STRIP_DEFAULT,
  );
  const pages = useMemo(
    () => chunkSchedulePages(bucket.matches, perPage),
    [bucket.matches, perPage],
  );
  const pageIndex = useBucketPageIndex(
    pages.length,
    `done-${bucket.matches.length}-${perPage}`,
  );
  const visible = pages[pageIndex] ?? [];

  return (
    <section
      className={cn(
        "flex h-[7.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border sm:h-[8.5rem]",
        theme.accent,
      )}
    >
      <BucketHeader bucket={bucket} theme={theme} pageIndex={pageIndex} pageCount={pages.length} />
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-hidden p-1.5 sm:px-2 sm:pb-2 sm:pt-1.5"
      >
        <ul
          key={`done-${pageIndex}-${perPage}`}
          className="flex h-full min-h-0 animate-in fade-in gap-1.5 duration-500 sm:gap-2"
        >
          {visible.map((m) => (
            <li key={`${m.kind}-${m.id}`} className="min-h-0 min-w-0 flex-1">
              <DisplayScheduleMatchCard
                match={m}
                gamesScoreMode={gamesScoreMode}
                density="strip"
                fillHeight
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AltViewBoard({
  sections,
  gamesScoreMode,
  hideCourt = false,
}: {
  sections: Array<{ key: string; label: string; matches: ScheduleMatchRow[] }>;
  gamesScoreMode: boolean;
  hideCourt?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden sm:gap-3">
      {sections.map((section) => (
        <AltViewSection
          key={section.key}
          label={section.label}
          matches={section.matches}
          gamesScoreMode={gamesScoreMode}
          hideCourt={hideCourt}
        />
      ))}
    </div>
  );
}

function AltViewSection({
  label,
  matches,
  gamesScoreMode,
  hideCourt = false,
}: {
  label: string;
  matches: ScheduleMatchRow[];
  gamesScoreMode: boolean;
  hideCourt?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const fitColumn = useCallback(
    (size: { width: number; height: number }) => fitMatchScheduleColumnPerPage(size.height),
    [],
  );
  const perPage = useDisplayFitCapacity(
    listRef,
    fitColumn,
    MATCH_SCHEDULE_DEFAULT_PER_PAGE,
  );
  const pages = useMemo(() => chunkSchedulePages(matches, perPage), [matches, perPage]);
  const pageIndex = useBucketPageIndex(pages.length, `${label}-${matches.length}-${perPage}`);
  const visible = pages[pageIndex] ?? [];
  const packed = visible.length >= Math.min(perPage, 3) && perPage >= 3;
  const cardProps = slideCardProps(visible.length, perPage);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 sm:text-sm">
          {label}
          <span className="ml-2 font-normal text-white/35">{matches.length}</span>
        </h2>
        {pages.length > 1 ? (
          <PageDots pageIndex={pageIndex} pageCount={pages.length} />
        ) : null}
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2">
        <ul
          key={`${label}-${pageIndex}-${perPage}`}
          className={cn(
            "h-full min-h-0 animate-in fade-in duration-500",
            packed
              ? "grid gap-1.5 sm:gap-2"
              : "flex flex-col justify-center gap-2.5 sm:gap-3",
          )}
          style={
            packed
              ? { gridTemplateRows: `repeat(${visible.length}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {visible.map((m) => (
            <li key={`${m.kind}-${m.id}`} className="min-h-0">
              <DisplayScheduleMatchCard
                match={m}
                gamesScoreMode={gamesScoreMode}
                hideCourt={hideCourt}
                {...cardProps}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BucketHeader({
  bucket,
  theme,
  pageIndex,
  pageCount,
}: {
  bucket: OrderOfPlayBucket;
  theme: (typeof BUCKET_THEME)[OrderOfPlayBucket["key"]];
  pageIndex: number;
  pageCount: number;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2.5 py-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("size-2.5 shrink-0 rounded-full", theme.dot)} aria-hidden />
        <h2 className={cn("text-xs font-bold uppercase tracking-wider sm:text-sm", theme.header)}>
          {bucket.label}
        </h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white/70">
          {bucket.matches.length}
        </span>
        {pageCount > 1 ? (
          <span className="text-[10px] font-medium text-white/35 sm:text-[11px]">
            · {pageIndex + 1}/{pageCount}
          </span>
        ) : null}
      </div>
      {pageCount > 1 ? <PageDots pageIndex={pageIndex} pageCount={pageCount} /> : null}
    </div>
  );
}

function PageDots({ pageIndex, pageCount }: { pageIndex: number; pageCount: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1" aria-hidden>
      {Array.from({ length: pageCount }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i === pageIndex ? "w-4 bg-white/70" : "w-1.5 bg-white/20",
          )}
        />
      ))}
    </div>
  );
}
