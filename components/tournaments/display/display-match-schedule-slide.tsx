"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ListOrdered, MapPin } from "lucide-react";
import {
  callStatusLabel,
  formatKickoffDateAndTimeParts,
  groupMatchesByCourt,
  groupMatchesByOrderOfPlay,
  groupMatchesByScheduleDay,
  scheduleStatusLabel,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { cn } from "@/lib/utils";

type BoardView = "orderOfPlay" | "schedule" | "court";

type DisplayMatchScheduleSlideProps = {
  tournamentName: string;
  liveData: Pick<
    TournamentLivePayload,
    "matches" | "courts" | "bracket" | "tournament" | "doubleStage"
  >;
  className?: string;
};

function mapLiveToScheduleRows(
  liveData: DisplayMatchScheduleSlideProps["liveData"],
): ScheduleMatchRow[] {
  const courts = liveData.courts ?? [];
  const bracketMatches = (liveData.bracket?.matches ?? []) as BracketMatchView[];
  const totalRounds = bracketMatches.length
    ? Math.max(...bracketMatches.map((m) => m.roundNumber), 1)
    : 1;

  const groupRows: ScheduleMatchRow[] = (liveData.matches ?? [])
    .filter((m) => m.type === "group_stage")
    .map((m) => {
      const groupName =
        typeof (m as { groupId?: string }).groupId === "string"
          ? ((liveData.doubleStage?.groups ?? []) as Array<{ id?: string; name?: string }>).find(
              (g) => g.id === (m as { groupId?: string }).groupId,
            )?.name ?? null
          : null;
      return {
        id: m.id,
        kind: "group" as const,
        stageLabel: groupName ? `Group stage · ${groupName}` : "Group stage",
        stageKindLabel: "Group stage",
        groupName,
        teamAName: m.teamAName ?? null,
        teamBName: m.teamBName ?? null,
        teamAPlayers: m.teamAPlayers ?? [],
        teamBPlayers: m.teamBPlayers ?? [],
        scoreA: m.scoreA ?? null,
        scoreB: m.scoreB ?? null,
        status: m.status ?? "pending",
        scheduledAt: null,
        startedAt: m.startedAt ?? null,
        courtId: m.courtId ?? null,
        courtName: resolveCourtLabel(m.courtId, courts),
        playOrder: null,
        callStatus: m.status === "completed" ? ("done" as const) : ("queued" as const),
      };
    });

  // Prefer double-stage overview groups when available (richer labels + schedule fields).
  const overviewGroups = (liveData.doubleStage?.groups ?? []) as Array<{
    id?: string;
    name?: string;
    matches?: Array<{
      id: string;
      teamAName?: string | null;
      teamBName?: string | null;
      teamAPlayers?: Array<{ displayName?: string }>;
      teamBPlayers?: Array<{ displayName?: string }>;
      scoreA?: number | null;
      scoreB?: number | null;
      status?: string;
      scheduledAt?: string | null;
      startedAt?: string | null;
      courtId?: string | null;
      playOrder?: number | null;
      callStatus?: string | null;
    }>;
  }>;

  const fromOverview: ScheduleMatchRow[] = overviewGroups.flatMap((g) =>
    (g.matches ?? []).map((m) => ({
      id: m.id,
      kind: "group" as const,
      stageLabel: g.name ? `Group stage · ${g.name}` : "Group stage",
      stageKindLabel: "Group stage",
      groupName: g.name ?? null,
      teamAName: m.teamAName ?? null,
      teamBName: m.teamBName ?? null,
      teamAPlayers: (m.teamAPlayers ?? []).map((p) => p.displayName ?? "").filter(Boolean),
      teamBPlayers: (m.teamBPlayers ?? []).map((p) => p.displayName ?? "").filter(Boolean),
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      status: m.status ?? "pending",
      scheduledAt: m.scheduledAt ?? null,
      startedAt: m.startedAt ?? null,
      courtId: m.courtId ?? null,
      courtName: resolveCourtLabel(m.courtId, courts),
      playOrder: m.playOrder ?? null,
      callStatus:
        m.status === "completed" || m.callStatus === "done"
          ? ("done" as const)
          : m.callStatus === "called" || m.callStatus === "on_court"
            ? (m.callStatus as "called" | "on_court")
            : ("queued" as const),
    })),
  );

  const bracketRows: ScheduleMatchRow[] = bracketMatches
    .filter((m) => m.matchNumber !== 999)
    .map((m) => ({
      id: m.id,
      kind: "bracket" as const,
      stageLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      stageKindLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      groupName: null,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
      scheduledAt: m.scheduledAt,
      startedAt: m.startedAt,
      courtId: m.courtId,
      courtName: resolveCourtLabel(m.courtId, courts),
      playOrder: m.playOrder,
      callStatus:
        m.status === "completed"
          ? ("done" as const)
          : m.callStatus === "called" || m.callStatus === "on_court" || m.callStatus === "done"
            ? m.callStatus
            : ("queued" as const),
    }));

  return [...(fromOverview.length ? fromOverview : groupRows), ...bracketRows];
}

/**
 * Full-screen venue TV Match Schedule / Order of Play board.
 */
export function DisplayMatchScheduleSlide({
  tournamentName,
  liveData,
  className,
}: DisplayMatchScheduleSlideProps) {
  const [view, setView] = useState<BoardView>("orderOfPlay");
  const rows = useMemo(() => mapLiveToScheduleRows(liveData), [liveData]);
  const buckets = useMemo(() => groupMatchesByOrderOfPlay(rows), [rows]);
  const days = useMemo(() => groupMatchesByScheduleDay(rows), [rows]);
  const courts = useMemo(() => groupMatchesByCourt(rows), [rows]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-2.5 sm:pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
            {tournamentName}
          </h1>
          <p className="mt-0.5 text-xs text-white/55 sm:text-sm">
            Match schedule
            {rows.length > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-white/75">{rows.length} fixtures</span>
              </>
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

      <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain sm:mt-4">
        {rows.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
            Fixtures appear here once groups or the knockout bracket are generated.
          </p>
        ) : view === "orderOfPlay" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {buckets.map((bucket) => (
              <section
                key={bucket.key}
                className="min-h-0 rounded-2xl border border-white/10 bg-[#0c1613]/90 p-3"
              >
                <h2
                  className={cn(
                    "mb-2 text-[11px] font-bold uppercase tracking-wider",
                    bucket.key === "now" && "text-amber-300",
                    bucket.key === "next" && "text-sky-300",
                    bucket.key === "later" && "text-white/55",
                    bucket.key === "done" && "text-white/40",
                  )}
                >
                  {bucket.label}
                  <span className="ml-1.5 font-normal text-white/35">
                    {bucket.matches.length}
                  </span>
                </h2>
                <ul className="space-y-1.5">
                  {bucket.matches.slice(0, 12).map((m) => (
                    <ScheduleTvRow key={`${m.kind}-${m.id}`} m={m} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : view === "schedule" ? (
          <div className="space-y-4">
            {days.map((day) => (
              <section key={day.dateKey}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/55">
                  {day.label}
                </h2>
                <ul className="space-y-1.5">
                  {day.matches.map((m) => (
                    <ScheduleTvRow key={`${m.kind}-${m.id}`} m={m} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {courts.map((court) => (
              <section
                key={court.courtKey}
                className="rounded-2xl border border-white/10 bg-[#0c1613]/90 p-3"
              >
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">
                  {court.label}
                </h2>
                <ul className="space-y-1.5">
                  {court.matches.map((m) => (
                    <ScheduleTvRow key={`${m.kind}-${m.id}`} m={m} hideCourt />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleTvRow({
  m,
  hideCourt = false,
}: {
  m: ScheduleMatchRow;
  hideCourt?: boolean;
}) {
  const kickoff = formatKickoffDateAndTimeParts(m.scheduledAt);
  const status = scheduleStatusLabel(m.status);
  const call = callStatusLabel(m.callStatus);

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {m.playOrder != null ? (
              <span className="mr-1.5 tabular-nums text-white/40">#{m.playOrder}</span>
            ) : null}
            {m.teamAName ?? "TBD"}
            <span className="mx-1 font-normal text-white/35">vs</span>
            {m.teamBName ?? "TBD"}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-white/45">
            {m.stageLabel}
            {!hideCourt && m.courtName ? ` · ${m.courtName}` : ""}
            {kickoff.time && kickoff.time !== "TBA" ? ` · ${kickoff.time}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {m.status === "completed" && m.scoreA != null && m.scoreB != null ? (
            <p className="text-sm font-bold tabular-nums text-white">
              {m.scoreA}–{m.scoreB}
            </p>
          ) : (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {m.status === "in_progress" ? "Live" : call.short || status.short}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
