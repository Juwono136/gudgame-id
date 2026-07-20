/**
 * Shared date/time formatting for tournament schedules (lists + public pages).
 */

function isValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date + time for a single instant (e.g. list cards). */
export function formatTournamentDateTime(iso: string | null | undefined): string | null {
  const d = isValidDate(iso);
  if (!d) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Public hero / meta range with start and end times when available.
 * Same calendar day → "Jul 3, 2026, 9:00 AM – 6:00 PM"
 * Different days → "Jul 3, 2026, 9:00 AM – Jul 17, 2026, 6:00 PM"
 */
export function formatTournamentScheduleRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  const start = isValidDate(startsAt);
  if (!start) return "Date TBA";

  const end = isValidDate(endsAt);
  if (!end) {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(start);
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    const datePart = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(start);
    const startTime = new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(start);
    const endTime = new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(end);
    return `${datePart}, ${startTime} – ${endTime}`;
  }

  const fmt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Compact list subtitle: start → end (falls back to start only). */
export function formatTournamentListSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string | null {
  const start = formatTournamentDateTime(startsAt);
  if (!start) return null;
  const end = formatTournamentDateTime(endsAt);
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}
