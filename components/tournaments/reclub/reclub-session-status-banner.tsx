"use client";

import { CalendarClock, Radio, TimerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  computeReclubSessionPhase,
  formatReclubSessionWindow,
  getReclubSessionEndedMessage,
  getReclubSessionNotLiveMessage,
  getReclubSessionPhaseLabel,
  type ReclubSessionSchedule,
} from "@/lib/tournaments/reclub/session-lifecycle";
import {
  sessionPhaseBadgeClass,
  sessionPhaseContainerClass,
} from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type ReclubSessionStatusBannerProps = {
  session: ReclubSessionSchedule;
  className?: string;
};

const PHASE_ICON = {
  upcoming: CalendarClock,
  live: Radio,
  ended: TimerOff,
} as const;

const PHASE_BADGE = sessionPhaseBadgeClass;

const PHASE_CONTAINER = sessionPhaseContainerClass;

export function ReclubSessionStatusBanner({
  session,
  className,
}: ReclubSessionStatusBannerProps) {
  const phase = computeReclubSessionPhase(session);
  const Icon = PHASE_ICON[phase];
  const schedule = formatReclubSessionWindow(session.startsAt, session.endsAt);

  const hint =
    phase === "ended"
      ? getReclubSessionEndedMessage()
      : phase === "upcoming"
        ? getReclubSessionNotLiveMessage()
        : "Session is live — squads can play rounds and bracket matches until the end time.";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 sm:flex sm:items-start sm:justify-between sm:gap-4",
        PHASE_CONTAINER[phase],
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            PHASE_BADGE[phase],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Session schedule</p>
            <Badge className={cn("text-[10px] uppercase tracking-wide", PHASE_BADGE[phase])}>
              {getReclubSessionPhaseLabel(phase)}
            </Badge>
          </div>
          {schedule ? (
            <p className="mt-1 text-sm text-cp-muted">{schedule}</p>
          ) : (
            <p className="mt-1 text-sm text-amber-400/90">Start and end times are required for Fun Match sessions.</p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-cp-muted">{hint}</p>
        </div>
      </div>
    </div>
  );
}
