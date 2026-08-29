import type { TournamentStatus } from "@/lib/domain/tournaments";

type DateInput = Date | string | null | undefined;

export type ReclubSessionPhase = "upcoming" | "live" | "ended";

export type ReclubSessionSchedule = {
  status: TournamentStatus | string;
  startsAt: DateInput;
  endsAt: DateInput;
};

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Derive reclub lobby phase from schedule (draft/cancelled are treated as ended). */
export function computeReclubSessionPhase(
  input: ReclubSessionSchedule,
  now: Date = new Date(),
): ReclubSessionPhase {
  if (input.status === "draft" || input.status === "cancelled") return "ended";

  const start = toDate(input.startsAt);
  const end = toDate(input.endsAt);

  if (end && now > end) return "ended";
  if (input.status === "completed") return "ended";
  if (start && now < start) return "upcoming";
  if (start && now >= start) return "live";

  return "upcoming";
}

export function canJoinReclubSession(input: ReclubSessionSchedule, now?: Date): boolean {
  return computeReclubSessionPhase(input, now) !== "ended";
}

export function canPlayReclubSession(input: ReclubSessionSchedule, now?: Date): boolean {
  return computeReclubSessionPhase(input, now) === "live";
}

/**
 * Knockout bracket seeding / pairings — allowed before the session clock starts
 * (and until seeding locks when a match is in progress or finished).
 * Distinct from {@link canPlayReclubSession} which gates live scoring only.
 */
export function canArrangeBracketPairings(
  input: ReclubSessionSchedule,
  options?: { seedingLocked?: boolean; now?: Date },
): boolean {
  if (options?.seedingLocked) return false;
  if (input.status === "cancelled" || input.status === "completed") return false;
  return computeReclubSessionPhase(input, options?.now) !== "ended";
}

export function getReclubSessionPhaseLabel(phase: ReclubSessionPhase): string {
  switch (phase) {
    case "upcoming":
      return "Upcoming";
    case "live":
      return "Live";
    case "ended":
      return "Ended";
  }
}

export function getReclubSessionEndedMessage(): string {
  return "This Fun Match has ended. Joining and new rounds are no longer available.";
}

export function getReclubSessionNotLiveMessage(): string {
  return "Play unlocks when the session start time is reached.";
}

export function getReclubSessionJoinBlockedMessage(phase: ReclubSessionPhase): string {
  if (phase === "ended") return getReclubSessionEndedMessage();
  return "This session is not open for joining right now.";
}

export function formatReclubSessionWindow(
  startsAt: DateInput,
  endsAt: DateInput,
  locale = "en-ID",
): string | null {
  const start = toDate(startsAt);
  const end = toDate(endsAt);
  if (!start || !end) return null;

  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${fmt.format(start)} → ${fmt.format(end)}`;
}
