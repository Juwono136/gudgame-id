"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ListOrdered, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  callStatusLabel,
  formatKickoffDateAndTimeParts,
  groupMatchesByCourt,
  groupMatchesByOrderOfPlay,
  groupMatchesByScheduleDay,
  scheduleStatusLabel,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";

type BoardView = "orderOfPlay" | "schedule" | "court";

const BUCKET_PAGE_SIZE = 8;

function MatchList({
  matches,
  gamesScoreMode,
  onEditSchedule,
  showCallStatus,
  hideCourtInLabel,
}: {
  matches: ScheduleMatchRow[];
  gamesScoreMode: boolean;
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  showCallStatus?: boolean;
  hideCourtInLabel?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? matches : matches.slice(0, BUCKET_PAGE_SIZE);
  const hiddenCount = matches.length - visible.length;

  return (
    <>
      <ul className="divide-y divide-cp-border/60 overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        {visible.map((m) => (
          <MatchRow
            key={`${m.kind}-${m.id}`}
            m={m}
            gamesScoreMode={gamesScoreMode}
            onEditSchedule={onEditSchedule}
            showCallStatus={showCallStatus}
            hideCourtInLabel={hideCourtInLabel}
          />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full rounded-lg border border-cp-border px-3 py-2 text-sm font-medium text-cp-primary hover:bg-cp-elevated/40"
        >
          Show {hiddenCount} more {hiddenCount === 1 ? "match" : "matches"}
        </button>
      ) : null}
      {expanded && matches.length > BUCKET_PAGE_SIZE ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 w-full text-sm text-cp-muted hover:text-foreground"
        >
          Show fewer
        </button>
      ) : null}
    </>
  );
}

type MatchScheduleBoardProps = {
  matches: ScheduleMatchRow[];
  gamesScoreMode?: boolean;
  className?: string;
  emptyMessage?: string;
  /** Manage: render schedule editor controls */
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  filter?: "all" | "group" | "knockout";
  onFilterChange?: (filter: "all" | "group" | "knockout") => void;
  /** Default Order of Play for partner/ops; schedule = day list; court = by court. */
  defaultView?: BoardView;
};

function MatchRow({
  m,
  gamesScoreMode,
  onEditSchedule,
  showCallStatus,
  hideCourtInLabel,
}: {
  m: ScheduleMatchRow;
  gamesScoreMode: boolean;
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  showCallStatus?: boolean;
  hideCourtInLabel?: boolean;
}) {
  const status = scheduleStatusLabel(m.status, m.kind);
  const call = callStatusLabel(m.callStatus);
  const displayScore =
    m.status === "completed" ||
    m.status === "in_progress" ||
    (m.callStatus === "on_court" && (m.scoreA != null || m.scoreB != null));
  const kickoff = formatKickoffDateAndTimeParts(m.scheduledAt);

  return (
    <li className="px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
          {m.playOrder != null ? `#${m.playOrder} ` : null}
          {m.stageLabel}
          {!hideCourtInLabel && m.courtName ? `, ${m.courtName}` : ""}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {showCallStatus ? (
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                call.className,
              )}
            >
              {call.short}
            </span>
          ) : (
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                status.className,
              )}
              title={status.full}
            >
              {status.short}
            </span>
          )}
          {onEditSchedule && m.status !== "completed" && m.status !== "bye" ? (
            <button
              type="button"
              onClick={() => onEditSchedule(m)}
              className="text-[11px] font-medium text-cp-primary hover:underline"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-3">
        <p className="truncate text-right text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
          {m.teamAName ?? "TBD"}
        </p>

        <div
          className={cn(
            "flex min-w-[6.25rem] flex-col items-center justify-center rounded-xl border px-2 py-1.5 sm:min-w-[7.25rem] sm:px-2.5 sm:py-2",
            displayScore
              ? "border-cp-border/80 bg-cp-elevated/50"
              : "border-transparent bg-transparent",
          )}
        >
          {displayScore ? (
            <>
              <p className="text-base font-bold tabular-nums leading-none text-foreground sm:text-lg">
                {m.scoreA ?? 0}
                <span className="mx-0.5 font-normal text-cp-muted">–</span>
                {m.scoreB ?? 0}
              </p>
              {gamesScoreMode ? (
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-cp-muted sm:text-[9px]">
                  Games
                </p>
              ) : null}
              {kickoff.date || kickoff.time !== "TBA" ? (
                <p className="mt-1 text-center text-[9px] font-medium leading-tight text-cp-muted sm:text-[10px]">
                  {kickoff.date ? (
                    <>
                      <span className="block whitespace-nowrap">{kickoff.date}</span>
                      <span className="block whitespace-nowrap tabular-nums">{kickoff.time}</span>
                    </>
                  ) : (
                    <span className="whitespace-nowrap tabular-nums">{kickoff.time}</span>
                  )}
                </p>
              ) : null}
            </>
          ) : (
            <div className="text-center">
              {kickoff.date ? (
                <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:text-[11px]">
                  {kickoff.date}
                </p>
              ) : null}
              <p
                className={cn(
                  "whitespace-nowrap font-semibold tabular-nums text-foreground",
                  kickoff.date ? "mt-0.5 text-xs sm:text-sm" : "text-xs sm:text-sm",
                  kickoff.time === "TBA" && "text-cp-muted",
                )}
              >
                {kickoff.time}
              </p>
            </div>
          )}
        </div>

        <p className="truncate text-left text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
          {m.teamBName ?? "TBD"}
        </p>
      </div>
    </li>
  );
}

/**
 * Schedule board + Order of Play (Now / Next / Later) + By day / By court.
 */
export function MatchScheduleBoard({
  matches,
  gamesScoreMode = false,
  className,
  emptyMessage = "No fixtures scheduled yet.",
  onEditSchedule,
  filter = "all",
  onFilterChange,
  defaultView = "orderOfPlay",
}: MatchScheduleBoardProps) {
  const [localFilter, setLocalFilter] = useState<"all" | "group" | "knockout">(filter);
  const [view, setView] = useState<BoardView>(defaultView);
  const activeFilter = onFilterChange ? filter : localFilter;
  const setFilter = onFilterChange ?? setLocalFilter;

  const filtered = useMemo(() => {
    if (activeFilter === "group") return matches.filter((m) => m.kind === "group");
    if (activeFilter === "knockout") return matches.filter((m) => m.kind === "bracket");
    return matches;
  }, [matches, activeFilter]);

  const days = useMemo(() => groupMatchesByScheduleDay(filtered), [filtered]);
  const buckets = useMemo(() => groupMatchesByOrderOfPlay(filtered), [filtered]);
  const courts = useMemo(() => groupMatchesByCourt(filtered), [filtered]);

  const viewTitle =
    view === "orderOfPlay" ? "Order of Play" : view === "schedule" ? "Match schedule" : "By court";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {view === "orderOfPlay" ? (
            <ListOrdered className="h-4 w-4 text-cp-primary" />
          ) : view === "schedule" ? (
            <CalendarDays className="h-4 w-4 text-cp-primary" />
          ) : (
            <MapPin className="h-4 w-4 text-cp-primary" />
          )}
          <h3 className="text-sm font-semibold text-foreground">{viewTitle}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full border border-cp-border bg-cp-elevated/40 p-0.5 text-[11px] font-semibold"
            role="tablist"
            aria-label="Board view"
          >
            {(
              [
                ["orderOfPlay", "Order of Play"],
                ["schedule", "By day"],
                ["court", "By court"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  view === key
                    ? "bg-cp-primary text-white"
                    : "text-cp-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="inline-flex rounded-full border border-cp-border bg-cp-elevated/40 p-0.5 text-[11px] font-semibold"
            role="tablist"
            aria-label="Schedule filter"
          >
            {(
              [
                ["all", "All"],
                ["group", "Group stage"],
                ["knockout", "Knockout"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeFilter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  activeFilter === key
                    ? "bg-cp-primary text-white"
                    : "text-cp-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-4 py-10 text-center text-sm text-cp-muted">
          {emptyMessage}
        </div>
      ) : view === "orderOfPlay" ? (
        <div className="space-y-6">
          {buckets.map((bucket) => (
            <section key={bucket.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-cp-border/70 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-cp-muted">
                  {bucket.label}
                </h4>
                <span className="text-[10px] text-cp-muted">
                  {bucket.matches.length} match{bucket.matches.length === 1 ? "" : "es"}
                </span>
              </div>
              {bucket.matches.length === 0 ? (
                <p className="px-1 py-2 text-xs text-cp-muted">Nothing here yet.</p>
              ) : (
                <MatchList
                  matches={bucket.matches}
                  gamesScoreMode={gamesScoreMode}
                  onEditSchedule={onEditSchedule}
                  showCallStatus
                />
              )}
            </section>
          ))}
        </div>
      ) : view === "schedule" ? (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.dateKey} className="space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-cp-border/70 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-cp-muted">
                  {day.label}
                </h4>
                <span className="text-[10px] text-cp-muted">
                  {day.matches.length} match{day.matches.length === 1 ? "" : "es"}
                </span>
              </div>
              <MatchList
                matches={day.matches}
                gamesScoreMode={gamesScoreMode}
                onEditSchedule={onEditSchedule}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {courts.map((court) => (
            <section key={court.courtKey} className="space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-cp-border/70 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-cp-muted">
                  {court.label}
                </h4>
                <span className="text-[10px] text-cp-muted">
                  {court.matches.length} match{court.matches.length === 1 ? "" : "es"}
                </span>
              </div>
              <MatchList
                matches={court.matches}
                gamesScoreMode={gamesScoreMode}
                onEditSchedule={onEditSchedule}
                hideCourtInLabel
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
