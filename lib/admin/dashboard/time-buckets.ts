import type { AdminDashboardRange } from "@/lib/validations/admin-dashboard";

export type TimeBucketUnit = "day" | "month";

export type DashboardPeriod = {
  range: AdminDashboardRange;
  start: Date;
  end: Date;
  bucketUnit: TimeBucketUnit;
  bucketCount: number;
  /** Inclusive ISO dates (YYYY-MM-DD). */
  fromIso: string;
  toIso: string;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  return startOfDay(new Date(`${iso}T12:00:00`));
}

function daysInclusive(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Keep chart series bounded as custom ranges grow:
 * daily buckets up to ~3 months, then monthly.
 */
export function pickBucketUnit(start: Date, end: Date): TimeBucketUnit {
  return daysInclusive(start, end) <= 92 ? "day" : "month";
}

function countBuckets(start: Date, end: Date, unit: TimeBucketUnit): number {
  let cursor = new Date(start);
  let n = 0;
  const endMs = end.getTime();
  while (cursor.getTime() <= endMs && n < 800) {
    n += 1;
    cursor = advanceBucket(cursor, unit);
  }
  return Math.max(1, n);
}

export function resolveDashboardPeriod(
  range: AdminDashboardRange,
  fromIso?: string,
  toIso?: string,
): DashboardPeriod {
  const now = new Date();
  const end = endOfDay(now);

  if (range === "week") {
    const start = startOfDay(new Date(end));
    start.setDate(start.getDate() - 6);
    return {
      range,
      start,
      end,
      bucketUnit: "day",
      bucketCount: 7,
      fromIso: toIsoDate(start),
      toIso: toIsoDate(end),
    };
  }

  if (range === "month") {
    const start = startOfDay(new Date(end));
    start.setDate(start.getDate() - 29);
    return {
      range,
      start,
      end,
      bucketUnit: "day",
      bucketCount: 30,
      fromIso: toIsoDate(start),
      toIso: toIsoDate(end),
    };
  }

  if (range === "year") {
    const start = startOfDay(new Date(end.getFullYear(), end.getMonth() - 11, 1));
    return {
      range,
      start,
      end,
      bucketUnit: "month",
      bucketCount: 12,
      fromIso: toIsoDate(start),
      toIso: toIsoDate(end),
    };
  }

  const from = fromIso ? parseIsoDate(fromIso) : startOfDay(new Date(end));
  const to = toIso ? endOfDay(parseIsoDate(toIso)) : end;
  const start = startOfDay(from);
  const bucketUnit = pickBucketUnit(start, to);
  const alignedStart =
    bucketUnit === "month"
      ? startOfDay(new Date(start.getFullYear(), start.getMonth(), 1))
      : start;

  return {
    range: "custom",
    start: alignedStart,
    end: to,
    bucketUnit,
    bucketCount: countBuckets(alignedStart, to, bucketUnit),
    fromIso: toIsoDate(start),
    toIso: toIsoDate(to),
  };
}

/** @deprecated Prefer resolveDashboardPeriod */
export function getRangeConfig(range: AdminDashboardRange): {
  start: Date;
  bucketUnit: TimeBucketUnit;
  bucketCount: number;
} {
  const period = resolveDashboardPeriod(range === "custom" ? "month" : range);
  return {
    start: period.start,
    bucketUnit: period.bucketUnit,
    bucketCount: period.bucketCount,
  };
}

function bucketKey(date: Date, unit: TimeBucketUnit): string {
  if (unit === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return toIsoDate(date);
}

function advanceBucket(date: Date, unit: TimeBucketUnit): Date {
  const next = new Date(date);
  if (unit === "month") {
    next.setMonth(next.getMonth() + 1, 1);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return startOfDay(next);
}

function formatBucketLabel(key: string, unit: TimeBucketUnit): string {
  if (unit === "month") {
    const [y, m] = key.split("-");
    return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(
      new Date(Number(y), Number(m) - 1, 1),
    );
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${key}T12:00:00`),
  );
}

export function buildEmptySeriesFromPeriod(
  period: DashboardPeriod,
): { key: string; label: string; count: number }[] {
  const series: { key: string; label: string; count: number }[] = [];
  let cursor = new Date(period.start);

  for (let i = 0; i < period.bucketCount; i++) {
    if (cursor.getTime() > period.end.getTime()) break;
    const key = bucketKey(cursor, period.bucketUnit);
    series.push({ key, label: formatBucketLabel(key, period.bucketUnit), count: 0 });
    cursor = advanceBucket(cursor, period.bucketUnit);
  }

  return series;
}

export function buildEmptySeries(
  range: AdminDashboardRange,
): { key: string; label: string; count: number }[] {
  return buildEmptySeriesFromPeriod(resolveDashboardPeriod(range === "custom" ? "month" : range));
}

export function mergeSeriesCountsForPeriod(
  period: DashboardPeriod,
  rows: { bucket: string; count: number }[],
): { key: string; label: string; count: number }[] {
  const base = buildEmptySeriesFromPeriod(period);
  const map = new Map(rows.map((r) => [r.bucket.slice(0, 10), Number(r.count)]));

  return base.map((point) => ({
    ...point,
    count: map.get(point.key) ?? map.get(point.key.slice(0, 7)) ?? 0,
  }));
}

export function mergeSeriesCounts(
  range: AdminDashboardRange,
  rows: { bucket: string; count: number }[],
): { key: string; label: string; count: number }[] {
  return mergeSeriesCountsForPeriod(
    resolveDashboardPeriod(range === "custom" ? "month" : range),
    rows,
  );
}

export function normalizeBucketValue(raw: string, unit: TimeBucketUnit): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return bucketKey(d, unit);
}

export function formatPeriodLabel(period: DashboardPeriod): string {
  if (period.range === "week") return "last 7 days";
  if (period.range === "month") return "last 30 days";
  if (period.range === "year") return "last 12 months";
  const from = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseIsoDate(period.fromIso));
  const to = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseIsoDate(period.toIso));
  return `${from} – ${to}`;
}
