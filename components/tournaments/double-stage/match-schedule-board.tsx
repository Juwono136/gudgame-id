"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ListOrdered, Loader2, MapPin, Pencil, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";
import {
  callStatusLabel,
  formatKickoffDateAndTimeParts,
  groupMatchesByCourt,
  groupMatchesByOrderOfPlay,
  groupMatchesByScheduleDay,
  groupNameAccentClass,
  scheduleStatusLabel,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";

type BoardView = "orderOfPlay" | "schedule" | "court";

export type ScheduleCourtOption = {
  id: string;
  name: string;
  courtNumber: number;
};

const BUCKET_PAGE_SIZE = 10;

const BUCKET_DOT: Record<string, string> = {
  now: "bg-rose-400",
  next: "bg-emerald-400",
  later: "bg-sky-400",
  done: "bg-cp-muted",
};

function MatchList({
  matches,
  gamesScoreMode,
  onEditSchedule,
  onStartMatch,
  showCallStatus,
  hideCourtInLabel,
  courts,
  occupiedCourtIds,
  startingMatchId,
  onCourtChange,
}: {
  matches: ScheduleMatchRow[];
  gamesScoreMode: boolean;
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  onStartMatch?: (match: ScheduleMatchRow, courtId: string) => void;
  showCallStatus?: boolean;
  hideCourtInLabel?: boolean;
  courts?: ScheduleCourtOption[];
  occupiedCourtIds?: Set<string>;
  startingMatchId?: string | null;
  onCourtChange?: (match: ScheduleMatchRow, courtId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? matches : matches.slice(0, BUCKET_PAGE_SIZE);
  const hiddenCount = matches.length - visible.length;

  return (
    <>
      <ul className="space-y-2.5 sm:space-y-3">
        {visible.map((m) => (
          <MatchRow
            key={`${m.kind}-${m.id}`}
            m={m}
            gamesScoreMode={gamesScoreMode}
            onEditSchedule={onEditSchedule}
            onStartMatch={onStartMatch}
            showCallStatus={showCallStatus}
            hideCourtInLabel={hideCourtInLabel}
            courts={courts}
            occupiedCourtIds={occupiedCourtIds}
            startingMatchId={startingMatchId}
            onCourtChange={onCourtChange}
          />
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full rounded-lg border border-cp-border px-3 py-2 text-sm font-medium text-cp-primary transition-colors hover:bg-cp-elevated/40"
        >
          Show {hiddenCount} more {hiddenCount === 1 ? "match" : "matches"}
        </button>
      ) : null}
      {expanded && matches.length > BUCKET_PAGE_SIZE ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1.5 w-full text-sm text-cp-muted transition-colors hover:text-foreground"
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
  title?: string;
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  /**
   * Manage: start this fixture on the selected court (group/bracket start APIs).
   * Requires a court id — use `courts` to show the picker on each row.
   */
  onStartMatch?: (match: ScheduleMatchRow, courtId: string) => void;
  /** Courts available for Start (manage Match Schedule). */
  courts?: ScheduleCourtOption[];
  /** Court ids currently hosting an in-progress match. */
  occupiedCourtIds?: Set<string>;
  startingMatchId?: string | null;
  /** Persist court assignment when the host changes the row picker. */
  onCourtChange?: (match: ScheduleMatchRow, courtId: string | null) => void;
  filter?: "all" | "group" | "knockout";
  onFilterChange?: (filter: "all" | "group" | "knockout") => void;
  defaultView?: BoardView;
};

function firstFreeCourtId(
  courts: ScheduleCourtOption[],
  occupied: Set<string>,
  preferred?: string | null,
): string {
  if (preferred && courts.some((c) => c.id === preferred) && !occupied.has(preferred)) {
    return preferred;
  }
  const free = courts.find((c) => !occupied.has(c.id));
  return free?.id ?? courts[0]?.id ?? "";
}

function MatchRow({
  m,
  gamesScoreMode,
  onEditSchedule,
  onStartMatch,
  showCallStatus,
  hideCourtInLabel,
  courts,
  occupiedCourtIds,
  startingMatchId,
  onCourtChange,
}: {
  m: ScheduleMatchRow;
  gamesScoreMode: boolean;
  onEditSchedule?: (match: ScheduleMatchRow) => void;
  onStartMatch?: (match: ScheduleMatchRow, courtId: string) => void;
  showCallStatus?: boolean;
  hideCourtInLabel?: boolean;
  courts?: ScheduleCourtOption[];
  occupiedCourtIds?: Set<string>;
  startingMatchId?: string | null;
  onCourtChange?: (match: ScheduleMatchRow, courtId: string | null) => void;
}) {
  const status = scheduleStatusLabel(m.status, m.kind);
  const call = callStatusLabel(m.callStatus);
  const canEdit =
    Boolean(onEditSchedule) && m.status !== "completed" && m.status !== "bye";
  const canStart =
    Boolean(onStartMatch) &&
    Boolean(courts?.length) &&
    m.status !== "completed" &&
    m.status !== "bye" &&
    m.status !== "in_progress";
  const isFinished = m.status === "completed" || m.status === "bye";
  const isLive = m.status === "in_progress" || m.callStatus === "on_court";
  const displayScore =
    isFinished ||
    m.status === "in_progress" ||
    (m.callStatus === "on_court" && (m.scoreA != null || m.scoreB != null));
  const kickoff = formatKickoffDateAndTimeParts(m.scheduledAt);
  const stageKind =
    m.stageKindLabel ??
    (m.kind === "group" ? "Group stage" : m.stageLabel.split("·")[0]?.trim() || "Knockout");
  const groupLabel = m.groupName ?? null;
  const occupied = occupiedCourtIds ?? new Set<string>();
  const courtOptions = courts ?? [];

  const [selectedCourtId, setSelectedCourtId] = useState(() =>
    canStart ? firstFreeCourtId(courtOptions, occupied, m.courtId) : m.courtId ?? "",
  );

  useEffect(() => {
    if (!canStart) {
      setSelectedCourtId(m.courtId ?? "");
      return;
    }
    setSelectedCourtId((prev) => {
      if (prev && courtOptions.some((c) => c.id === prev) && !occupied.has(prev)) {
        return prev;
      }
      if (prev && prev === m.courtId) return prev;
      return firstFreeCourtId(courtOptions, occupied, m.courtId);
    });
  }, [canStart, courtOptions, m.courtId, m.id, occupied]);

  const courtLabel = hideCourtInLabel
    ? null
    : m.courtName?.trim() ||
      courtOptions.find((c) => c.id === (m.courtId ?? selectedCourtId))?.name ||
      null;
  const isStarting = startingMatchId === m.id;
  const hasActions = canStart || canEdit;
  const startDisabled = !selectedCourtId || isStarting || occupied.has(selectedCourtId);

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourtId(courtId);
    onCourtChange?.(m, courtId || null);
  };

  return (
    <li className="rounded-xl border border-cp-border/80 bg-cp-card/80 px-3 py-3.5 shadow-sm transition-colors hover:bg-cp-elevated/25 sm:px-4 sm:py-4">
      {/* Header: #queue · stage · group + status */}
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 sm:mb-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs">
          <span className="shrink-0 tabular-nums font-medium text-cp-muted">
            {m.playOrder != null ? `#${m.playOrder}` : "—"}
          </span>
          <span className="text-cp-muted/50" aria-hidden>
            ·
          </span>
          <span className="font-medium text-foreground">{stageKind}</span>
          {groupLabel ? (
            <>
              <span className="text-cp-muted/50" aria-hidden>
                ·
              </span>
              <span className={cn("font-semibold", groupNameAccentClass(groupLabel))}>
                {groupLabel}
              </span>
            </>
          ) : null}
        </div>
        {showCallStatus && !isLive && !isFinished ? (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:text-[10px]",
              call.className,
            )}
          >
            {call.short}
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:text-[10px]",
              status.className,
            )}
            title={status.full}
          >
            {isLive ? "Live" : status.short}
          </span>
        )}
      </div>

      {/* Matchup: Team A | Time/Score | Team B — same on mobile + desktop */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-4">
        <div className="min-w-0 text-left">
          <p
            className="truncate text-[15px] font-bold leading-tight text-foreground sm:text-base"
            title={m.teamAName ?? "TBD"}
          >
            {m.teamAName ?? "TBD"}
          </p>
          <TeamPlayerList
            names={m.teamAPlayers}
            maxNames={3}
            align="left"
            className="mt-1"
          />
        </div>

        <div className="flex min-w-[4.5rem] flex-col items-center justify-center px-1 pt-0.5 sm:min-w-[5.5rem]">
          {displayScore ? (
            <>
              <p className="text-lg font-bold tabular-nums leading-none text-foreground sm:text-xl">
                {m.scoreA ?? 0}
                <span className="mx-0.5 font-normal text-cp-muted">–</span>
                {m.scoreB ?? 0}
              </p>
              {gamesScoreMode ? (
                <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-cp-muted">
                  Games
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p
                className={cn(
                  "text-base font-bold tabular-nums leading-none sm:text-lg",
                  kickoff.time === "TBA" ? "text-cp-muted" : "text-cp-primary",
                )}
              >
                {kickoff.time}
              </p>
              {kickoff.date ? (
                <p className="mt-1 text-[10px] leading-tight text-cp-muted sm:text-[11px]">
                  {kickoff.date}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="min-w-0 text-right">
          <p
            className="truncate text-[15px] font-bold leading-tight text-foreground sm:text-base"
            title={m.teamBName ?? "TBD"}
          >
            {m.teamBName ?? "TBD"}
          </p>
          <TeamPlayerList
            names={m.teamBPlayers}
            maxNames={3}
            align="right"
            className="mt-1"
          />
        </div>
      </div>

      {/* Court picker / pill + manage actions */}
      {(courtLabel || hasActions || (canStart && courtOptions.length > 0)) && (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2",
            hasActions ? "justify-between" : "justify-center",
          )}
        >
          {canStart && courtOptions.length > 0 ? (
            <div className="min-w-0 flex-1 sm:max-w-[11rem]">
              <Select
                value={selectedCourtId || undefined}
                onValueChange={handleCourtSelect}
                disabled={isStarting}
              >
                <SelectTrigger
                  aria-label="Select court"
                  className={cn(cpSelectTriggerClass, "h-8 w-full text-xs")}
                >
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  {courtOptions.map((c) => {
                    const busy = occupied.has(c.id) && c.id !== m.courtId;
                    return (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        disabled={busy}
                        className={cpSelectItemClass}
                      >
                        {c.name}
                        {busy ? " · live" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : courtLabel ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-emerald-500/45 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 sm:text-[11px]",
                !hasActions && "mx-auto",
              )}
            >
              {courtLabel}
            </span>
          ) : (
            <span className="flex-1" aria-hidden />
          )}
          {hasActions ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {canStart ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 px-3"
                  disabled={startDisabled}
                  title={
                    !selectedCourtId
                      ? "Select a court first"
                      : occupied.has(selectedCourtId)
                        ? "That court is already live"
                        : "Start scoring on this court"
                  }
                  onClick={() => {
                    if (!selectedCourtId || startDisabled) return;
                    onStartMatch?.(m, selectedCourtId);
                  }}
                >
                  {isStarting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {isStarting ? "Starting…" : "Start"}
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={() => onEditSchedule?.(m)}
                  aria-label={`Edit schedule for ${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Schedule</span>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

/**
 * Match Schedule board — Order of Play / By day / By court.
 */
export function MatchScheduleBoard({
  matches,
  gamesScoreMode = false,
  className,
  emptyMessage = "No fixtures scheduled yet.",
  title = "Match Schedule",
  onEditSchedule,
  onStartMatch,
  courts: courtOptions,
  occupiedCourtIds,
  startingMatchId = null,
  onCourtChange,
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
  const courtGroups = useMemo(() => groupMatchesByCourt(filtered), [filtered]);

  const listProps = {
    gamesScoreMode,
    onEditSchedule,
    onStartMatch,
    courts: courtOptions,
    occupiedCourtIds,
    startingMatchId,
    onCourtChange,
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-cp-border bg-cp-elevated/40 p-0.5 text-[11px] font-semibold"
            role="tablist"
            aria-label="Board view"
          >
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
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors",
                  view === key
                    ? "bg-cp-primary text-white shadow-sm"
                    : "text-cp-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <div
            className="inline-flex rounded-lg border border-cp-border bg-cp-elevated/40 p-0.5 text-[11px] font-semibold"
            role="tablist"
            aria-label="Stage filter"
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
                  "rounded-md px-2.5 py-1.5 transition-colors",
                  activeFilter === key
                    ? "bg-cp-primary text-white shadow-sm"
                    : "text-cp-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {onEditSchedule ? (
        <p className="text-xs text-cp-muted sm:text-sm">
          <span className="font-medium text-foreground">Now</span> = on court ·{" "}
          <span className="font-medium text-foreground">Next</span> = called / next in queue ·{" "}
          <span className="font-medium text-foreground">Later</span> = rest of the list.
          {onStartMatch && courtOptions?.length ? (
            <>
              {" "}
              Pick a <span className="font-medium text-foreground">court</span>, then{" "}
              <span className="font-medium text-foreground">Start</span> to open live scoring.
            </>
          ) : null}
        </p>
      ) : null}

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-cp-border bg-cp-card/40 px-4 py-10 text-center text-sm text-cp-muted">
          {emptyMessage}
        </div>
      ) : view === "orderOfPlay" ? (
        <div className="space-y-5">
          {buckets.map((bucket) => (
            <section key={bucket.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cp-muted">
                  <span
                    className={cn("h-2 w-2 rounded-full", BUCKET_DOT[bucket.key] ?? "bg-cp-muted")}
                    aria-hidden
                  />
                  {bucket.label}
                </h3>
                <span className="text-[10px] text-cp-muted">
                  {bucket.matches.length} match{bucket.matches.length === 1 ? "" : "es"}
                </span>
              </div>
              {bucket.matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cp-border/80 bg-cp-elevated/20 px-4 py-6 text-center">
                  <CalendarDays className="h-5 w-5 text-cp-muted" aria-hidden />
                  <p className="text-xs text-cp-muted">Nothing here yet.</p>
                </div>
              ) : (
                <MatchList matches={bucket.matches} showCallStatus {...listProps} />
              )}
            </section>
          ))}
        </div>
      ) : view === "schedule" ? (
        <div className="space-y-5">
          {days.map((day) => (
            <section key={day.dateKey} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-cp-muted">
                  {day.label}
                </h3>
                <span className="text-[10px] text-cp-muted">
                  {day.matches.length} match{day.matches.length === 1 ? "" : "es"}
                </span>
              </div>
              <MatchList matches={day.matches} {...listProps} />
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {courtGroups.map((court) => (
            <section key={court.courtKey} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-cp-muted">
                  {court.label}
                </h3>
                <span className="text-[10px] text-cp-muted">
                  {court.matches.length} match{court.matches.length === 1 ? "" : "es"}
                </span>
              </div>
              <MatchList matches={court.matches} hideCourtInLabel {...listProps} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
