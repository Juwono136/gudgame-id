/**
 * Shared types + helpers for FIFA-style match schedule lists and Order of Play.
 */

export const MATCH_CALL_STATUSES = ["queued", "called", "on_court", "done"] as const;
export type MatchCallStatus = (typeof MATCH_CALL_STATUSES)[number];

export type ScheduleMatchRow = {
  id: string;
  kind: "group" | "bracket";
  stageLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  /** Games won when matchScoreMode = games; otherwise match points. */
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  scheduledAt: string | null;
  courtName?: string | null;
  courtId?: string | null;
  venueHint?: string | null;
  playOrder?: number | null;
  callStatus?: MatchCallStatus | null;
};

export type ScheduleDayGroup = {
  dateKey: string;
  label: string;
  matches: ScheduleMatchRow[];
};

export type OrderOfPlayBucket = {
  key: "now" | "next" | "later" | "done";
  label: string;
  matches: ScheduleMatchRow[];
};

export type ScheduleCourtGroup = {
  courtKey: string;
  label: string;
  matches: ScheduleMatchRow[];
};

export function parseCallStatus(raw: unknown): MatchCallStatus {
  if (raw === "called" || raw === "on_court" || raw === "done" || raw === "queued") {
    return raw;
  }
  return "queued";
}

export function scheduleStatusLabel(
  status: string,
  kind: "group" | "bracket" = "bracket",
): {
  short: string;
  full: string;
  className: string;
} {
  if (status === "completed") {
    return {
      short: kind === "group" ? "Ended" : "Final",
      full: "Match finished",
      className: "border-cp-border/70 bg-cp-elevated/40 text-cp-muted",
    };
  }
  if (status === "in_progress") {
    return {
      short: "Live",
      full: "Match in progress",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    };
  }
  if (status === "bye") {
    return {
      short: "Bye",
      full: "Walkover / bye",
      className: "border-cp-border/70 bg-cp-elevated/40 text-cp-muted",
    };
  }
  return {
    short: "Upcoming",
    full: "Scheduled or time not set yet",
    className: "border-cp-border/70 bg-cp-elevated/40 text-cp-muted",
  };
}

export function callStatusLabel(status: MatchCallStatus | null | undefined): {
  short: string;
  className: string;
} {
  switch (status) {
    case "on_court":
      return {
        short: "On court",
        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      };
    case "called":
      return {
        short: "Called",
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
      };
    case "done":
      return {
        short: "Done",
        className: "border-cp-border/70 bg-cp-elevated/40 text-cp-muted",
      };
    default:
      return {
        short: "Queued",
        className: "border-cp-border/70 bg-cp-elevated/40 text-cp-muted",
      };
  }
}

function sortByPlayOrder(a: ScheduleMatchRow, b: ScheduleMatchRow): number {
  const oa = a.playOrder ?? Number.MAX_SAFE_INTEGER;
  const ob = b.playOrder ?? Number.MAX_SAFE_INTEGER;
  if (oa !== ob) return oa - ob;
  const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  return ta - tb;
}

/**
 * Build Now / Next / Later / Done buckets for the Order of Play surface.
 * Live / on_court → Now; called → Next; remaining unfinished → Later; completed → Done.
 */
export function groupMatchesByOrderOfPlay(rows: ScheduleMatchRow[]): OrderOfPlayBucket[] {
  const now: ScheduleMatchRow[] = [];
  const next: ScheduleMatchRow[] = [];
  const later: ScheduleMatchRow[] = [];
  const done: ScheduleMatchRow[] = [];

  for (const row of rows) {
    if (row.status === "completed" || row.status === "bye" || row.callStatus === "done") {
      done.push(row);
      continue;
    }
    if (row.status === "in_progress" || row.callStatus === "on_court") {
      now.push(row);
      continue;
    }
    if (row.callStatus === "called") {
      next.push(row);
      continue;
    }
    later.push(row);
  }

  return [
    { key: "now" as const, label: "Now", matches: now.sort(sortByPlayOrder) },
    { key: "next" as const, label: "Next", matches: next.sort(sortByPlayOrder) },
    { key: "later" as const, label: "Later", matches: later.sort(sortByPlayOrder) },
    { key: "done" as const, label: "Done", matches: done.sort(sortByPlayOrder) },
  ].filter((b) => b.matches.length > 0 || b.key !== "done");
}

/**
 * Group fixtures by assigned court. Unassigned courts land in an "Unassigned" bucket.
 * Within each court, prefer playOrder then scheduled time.
 */
export function groupMatchesByCourt(rows: ScheduleMatchRow[]): ScheduleCourtGroup[] {
  const map = new Map<string, { label: string; matches: ScheduleMatchRow[] }>();

  for (const row of rows) {
    const name = row.courtName?.trim();
    const courtKey = row.courtId?.trim() || (name ? `name:${name}` : "unassigned");
    const label = name || (row.courtId ? "Court" : "Unassigned");
    const existing = map.get(courtKey);
    if (existing) {
      existing.matches.push(row);
      if (!existing.label || existing.label === "Court") {
        if (name) existing.label = name;
      }
    } else {
      map.set(courtKey, { label, matches: [row] });
    }
  }

  const assigned: ScheduleCourtGroup[] = [];
  let unassigned: ScheduleCourtGroup | null = null;

  for (const [courtKey, value] of map.entries()) {
    const group: ScheduleCourtGroup = {
      courtKey,
      label: value.label,
      matches: value.matches.sort(sortByPlayOrder),
    };
    if (courtKey === "unassigned") {
      unassigned = group;
    } else {
      assigned.push(group);
    }
  }

  assigned.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  if (unassigned) assigned.push(unassigned);
  return assigned;
}

export function groupMatchesByScheduleDay(rows: ScheduleMatchRow[]): ScheduleDayGroup[] {
  const map = new Map<string, ScheduleMatchRow[]>();
  const unscheduled: ScheduleMatchRow[] = [];

  for (const row of rows) {
    if (!row.scheduledAt) {
      unscheduled.push(row);
      continue;
    }
    const d = new Date(row.scheduledAt);
    if (Number.isNaN(d.getTime())) {
      unscheduled.push(row);
      continue;
    }
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const days: ScheduleDayGroup[] = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, matches]) => {
      const sample = new Date(matches[0]!.scheduledAt!);
      const label = new Intl.DateTimeFormat("en", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(sample);
      return {
        dateKey,
        label,
        matches: matches.sort((a, b) => {
          const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return ta - tb;
        }),
      };
    });

  if (unscheduled.length) {
    days.push({
      dateKey: "unscheduled",
      label: "Time TBA",
      matches: unscheduled.sort(sortByPlayOrder),
    });
  }

  return days;
}

/** Keep AM/PM on the same line as the clock time in tight UI slots. */
function withNonBreakingAmPm(label: string): string {
  return label.replace(/\s+(AM|PM)$/i, "\u00A0$1");
}

export function formatKickoffTime(iso: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBA";
  return withNonBreakingAmPm(
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d),
  );
}

/** Compact date + time for group fixture lists (matches Match schedule kickoff). */
export function formatKickoffDateTime(iso: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBA";
  const date = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
  return `${date} · ${formatKickoffTime(iso)}`;
}
