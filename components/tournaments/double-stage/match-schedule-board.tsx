"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatKickoffTime,
  groupMatchesByScheduleDay,
  scheduleStatusLabel,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";

type MatchScheduleBoardProps = {
  matches: ScheduleMatchRow[];
  gamesScoreMode?: boolean;
  className?: string;
  emptyMessage?: string;
  /** Manage: render schedule editor controls */
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  filter?: "all" | "group" | "knockout";
  onFilterChange?: (filter: "all" | "group" | "knockout") => void;
};

/**
 * FIFA-inspired schedule board: day headers + compact match rows.
 * Score sits in a fixed-width pill so team names stay close and readable on all widths.
 */
export function MatchScheduleBoard({
  matches,
  gamesScoreMode = false,
  className,
  emptyMessage = "No fixtures scheduled yet.",
  onEditSchedule,
  filter = "all",
  onFilterChange,
}: MatchScheduleBoardProps) {
  const [localFilter, setLocalFilter] = useState<"all" | "group" | "knockout">(filter);
  const activeFilter = onFilterChange ? filter : localFilter;
  const setFilter = onFilterChange ?? setLocalFilter;

  const filtered = useMemo(() => {
    if (activeFilter === "group") return matches.filter((m) => m.kind === "group");
    if (activeFilter === "knockout") return matches.filter((m) => m.kind === "bracket");
    return matches;
  }, [matches, activeFilter]);

  const days = useMemo(() => groupMatchesByScheduleDay(filtered), [filtered]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-cp-primary" />
          <h3 className="text-sm font-semibold text-foreground">Match schedule</h3>
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

      {!days.length ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-4 py-10 text-center text-sm text-cp-muted">
          {emptyMessage}
        </div>
      ) : (
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
              <ul className="divide-y divide-cp-border/60 overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
                {day.matches.map((m) => {
                  const status = scheduleStatusLabel(m.status);
                  const displayScore =
                    m.status === "completed" || m.status === "in_progress";

                  return (
                    <li key={`${m.kind}-${m.id}`} className="px-3 py-3 sm:px-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                          {m.stageLabel}
                          {m.courtName ? ` · ${m.courtName}` : ""}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              status.className,
                            )}
                            title={status.full}
                          >
                            {status.short}
                          </span>
                          {onEditSchedule && m.status !== "completed" && m.status !== "bye" ? (
                            <button
                              type="button"
                              onClick={() => onEditSchedule(m)}
                              className="text-[11px] font-medium text-cp-primary hover:underline"
                            >
                              Set time
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
                            "flex min-w-[5.75rem] flex-col items-center justify-center rounded-xl border px-2 py-1.5 sm:min-w-[6.5rem] sm:px-2.5 sm:py-2",
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
                            </>
                          ) : (
                            <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-cp-muted sm:text-sm">
                              {formatKickoffTime(m.scheduledAt)}
                            </p>
                          )}
                        </div>

                        <p className="truncate text-left text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
                          {m.teamBName ?? "TBD"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
