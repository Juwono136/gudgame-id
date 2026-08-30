"use client";

import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import {
  callStatusLabel,
  formatKickoffDateAndTimeParts,
  groupNameAccentClass,
  scheduleStatusLabel,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { cn } from "@/lib/utils";

type DisplayScheduleMatchCardProps = {
  match: ScheduleMatchRow;
  gamesScoreMode?: boolean;
  emphasize?: boolean;
  hideCourt?: boolean;
  /**
   * `carousel` — compact 5-up TV slide (inline players, court in header).
   * `comfortable` — larger cards when a bucket shows fewer than 5 fixtures.
   */
  density?: "carousel" | "comfortable";
  /** Fill equal grid row in 5-up carousel. */
  fillHeight?: boolean;
  className?: string;
};

/**
 * Venue TV match card — mirrors public Matches tab layout (teams, players, score/time, stage, court).
 */
export function DisplayScheduleMatchCard({
  match: m,
  gamesScoreMode = false,
  emphasize = false,
  hideCourt = false,
  density = "comfortable",
  fillHeight = false,
  className,
}: DisplayScheduleMatchCardProps) {
  const status = scheduleStatusLabel(m.status, m.kind);
  const call = callStatusLabel(m.callStatus);
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
  const courtLabel = hideCourt ? null : m.courtName?.trim() || null;
  const isCarousel = density === "carousel";
  const playerLayout = isCarousel ? "inline" : "stack";

  return (
    <article
      className={cn(
        "flex w-full flex-col rounded-xl border shadow-sm",
        fillHeight ? "h-full min-h-0 justify-center" : "shrink-0",
        isCarousel ? "px-2.5 py-1.5 sm:px-3 sm:py-2" : "justify-center px-3 py-3 sm:px-4 sm:py-3.5",
        emphasize || isLive
          ? "border-amber-400/35 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]"
          : "border-white/12 bg-white/[0.05]",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5",
          isCarousel ? "mb-1" : "mb-2 sm:mb-2.5",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5",
            isCarousel ? "text-[10px]" : "text-[11px] sm:text-xs",
          )}
        >
          <span className="shrink-0 tabular-nums font-medium text-white/45">
            {m.playOrder != null ? `#${m.playOrder}` : "—"}
          </span>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <span className="font-medium text-white/90">{stageKind}</span>
          {groupLabel ? (
            <>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <span className={cn("font-semibold", groupNameAccentClass(groupLabel))}>
                {groupLabel}
              </span>
            </>
          ) : null}
          {isCarousel && courtLabel ? (
            <>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <span className="font-medium text-white/45">{courtLabel}</span>
            </>
          ) : null}
          {isCarousel && !courtLabel ? (
            <>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <span className="text-white/30">Court —</span>
            </>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-px text-[8px] font-bold uppercase tracking-wide sm:text-[9px]",
            !isCarousel && "px-2 py-0.5 sm:text-[10px]",
            isLive
              ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
              : isFinished
                ? "border-white/15 bg-white/5 text-white/45"
                : "border-white/15 bg-white/5 text-white/55",
          )}
          title={isLive ? "Live" : status.full}
        >
          {isLive ? "Live" : call.short || status.short}
        </span>
      </div>

      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center",
          isCarousel ? "gap-1.5 sm:gap-2" : "items-start gap-2 sm:gap-4",
        )}
      >
        <div className="min-w-0 text-left">
          <p
            className={cn(
              "break-words font-bold leading-tight text-white",
              isCarousel ? "text-[13px] sm:text-sm" : "text-[15px] sm:text-base leading-snug",
            )}
            title={m.teamAName ?? "TBD"}
          >
            {m.teamAName ?? "TBD"}
          </p>
          <TeamPlayerList
            names={m.teamAPlayers}
            maxNames={4}
            align="left"
            tone="display"
            layout={playerLayout}
            compact={isCarousel}
            className={isCarousel ? "mt-0.5" : "mt-1"}
          />
        </div>

        <div
          className={cn(
            "flex flex-col items-center justify-center px-0.5",
            isCarousel ? "min-w-[3.25rem] sm:min-w-[3.75rem]" : "min-w-[4.5rem] pt-0.5 sm:min-w-[5.5rem]",
          )}
        >
          {displayScore ? (
            <>
              <p
                className={cn(
                  "font-bold tabular-nums leading-none text-white",
                  isCarousel ? "text-base sm:text-lg" : "text-lg sm:text-xl",
                )}
              >
                {m.scoreA ?? 0}
                <span className="mx-0.5 font-normal text-white/35">–</span>
                {m.scoreB ?? 0}
              </p>
              {gamesScoreMode ? (
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-white/40">
                  Games
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p
                className={cn(
                  "font-bold tabular-nums leading-none",
                  isCarousel ? "text-sm sm:text-base" : "text-base sm:text-lg",
                  kickoff.time === "TBA" ? "text-white/40" : "text-emerald-300",
                )}
              >
                {kickoff.time}
              </p>
              {!isCarousel && kickoff.date ? (
                <p className="mt-1 text-[10px] leading-tight text-white/45 sm:text-[11px]">
                  {kickoff.date}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="min-w-0 text-right">
          <p
            className={cn(
              "break-words font-bold leading-tight text-white",
              isCarousel ? "text-[13px] sm:text-sm" : "text-[15px] sm:text-base leading-snug",
            )}
            title={m.teamBName ?? "TBD"}
          >
            {m.teamBName ?? "TBD"}
          </p>
          <TeamPlayerList
            names={m.teamBPlayers}
            maxNames={4}
            align="right"
            tone="display"
            layout={playerLayout}
            compact={isCarousel}
            className={isCarousel ? "mt-0.5" : "mt-1"}
          />
        </div>
      </div>

      {!isCarousel && !hideCourt ? (
        courtLabel ? (
          <p className="mt-2.5 text-center text-[10px] font-medium text-white/45 sm:mt-3 sm:text-[11px]">
            {courtLabel}
          </p>
        ) : (
          <p className="mt-2.5 text-center text-[10px] text-white/30 sm:mt-3 sm:text-[11px]">
            Court —
          </p>
        )
      ) : null}
    </article>
  );
}
