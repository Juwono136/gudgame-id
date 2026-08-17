/**
 * Build calendar payloads for tournament events (Google, Outlook, Apple Calendar).
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC timestamp for ICS: 20260721T020000Z */
export function toIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** ISO-8601 without milliseconds for Outlook deeplinks */
export function toOutlookIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join("\r\n");
}

export type TournamentCalendarEvent = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  url?: string | null;
  uid?: string;
};

function resolveEventWindow(event: TournamentCalendarEvent): { start: Date; end: Date } | null {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;

  const endSource = event.endsAt ? new Date(event.endsAt) : null;
  const end =
    endSource && !Number.isNaN(endSource.getTime()) && endSource > start
      ? endSource
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return { start, end };
}

export function buildTournamentIcs(event: TournamentCalendarEvent): string | null {
  const window = resolveEventWindow(event);
  if (!window) return null;
  const { start, end } = window;

  const uid =
    event.uid?.trim() ||
    `${start.getTime()}-${Math.random().toString(36).slice(2, 10)}@courtpedia`;
  const now = toIcsUtc(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gud Game//Tournament//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description.trim())}`);
  }
  if (event.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(event.location.trim())}`);
  }
  if (event.url?.trim()) {
    lines.push(`URL:${event.url.trim()}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n");
}

/** Google Calendar template dates: 20260721T020000Z/20260721T040000Z */
export function buildGoogleCalendarUrl(event: TournamentCalendarEvent): string | null {
  const window = resolveEventWindow(event);
  if (!window) return null;
  const { start, end } = window;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
  });
  if (event.description?.trim()) params.set("details", event.description.trim());
  if (event.location?.trim()) params.set("location", event.location.trim());
  if (event.url?.trim()) {
    const details = params.get("details") ?? "";
    params.set("details", details ? `${details}\n\n${event.url}` : event.url);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook / Hotmail web compose deeplink — no file download. */
export function buildOutlookCalendarUrl(event: TournamentCalendarEvent): string | null {
  const window = resolveEventWindow(event);
  if (!window) return null;
  const { start, end } = window;

  let body = event.description?.trim() ?? "";
  if (event.url?.trim()) {
    body = body ? `${body}\n\n${event.url}` : event.url;
  }

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: toOutlookIso(start),
    enddt: toOutlookIso(end),
  });
  if (body) params.set("body", body);
  if (event.location?.trim()) params.set("location", event.location.trim());

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Open an ICS payload in the device calendar app when possible.
 * Avoids a forced “Save as…” download on platforms that can hand off to Calendar.
 */
export function openCalendarEventInApp(icsContent: string): boolean {
  try {
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    // Intentionally no `download` attribute — Safari/iOS can open Calendar directly.
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 2_000);
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Prefer openCalendarEventInApp for user-facing flows */
export function downloadIcsFile(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export function slugifyCalendarFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "tournament";
}
