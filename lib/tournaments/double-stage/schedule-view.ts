/**
 * Shared types + helpers for FIFA-style match schedule lists (group + knockout).
 */

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
  venueHint?: string | null;
};

export type ScheduleDayGroup = {
  dateKey: string;
  label: string;
  matches: ScheduleMatchRow[];
};

export function scheduleStatusLabel(status: string): {
  short: string;
  full: string;
  className: string;
} {
  if (status === "completed") {
    return {
      short: "Final",
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
      matches: unscheduled,
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
