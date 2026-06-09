import type { AdminDashboardRange } from "@/lib/validations/admin-dashboard";

export type TimeBucketUnit = "day" | "month";

export function getRangeConfig(range: AdminDashboardRange): {
  start: Date;
  bucketUnit: TimeBucketUnit;
  bucketCount: number;
} {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === "week") {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, bucketUnit: "day", bucketCount: 7 };
  }

  if (range === "month") {
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, bucketUnit: "day", bucketCount: 30 };
  }

  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  start.setHours(0, 0, 0, 0);
  return { start, bucketUnit: "month", bucketCount: 12 };
}

function bucketKey(date: Date, unit: TimeBucketUnit): string {
  if (unit === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}

function advanceBucket(date: Date, unit: TimeBucketUnit): Date {
  const next = new Date(date);
  if (unit === "month") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
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

export function buildEmptySeries(
  range: AdminDashboardRange,
): { key: string; label: string; count: number }[] {
  const { start, bucketUnit, bucketCount } = getRangeConfig(range);
  const series: { key: string; label: string; count: number }[] = [];
  let cursor = new Date(start);

  for (let i = 0; i < bucketCount; i++) {
    const key = bucketKey(cursor, bucketUnit);
    series.push({ key, label: formatBucketLabel(key, bucketUnit), count: 0 });
    cursor = advanceBucket(cursor, bucketUnit);
  }

  return series;
}

export function mergeSeriesCounts(
  range: AdminDashboardRange,
  rows: { bucket: string; count: number }[],
): { key: string; label: string; count: number }[] {
  const base = buildEmptySeries(range);
  const map = new Map(rows.map((r) => [r.bucket.slice(0, 10), Number(r.count)]));

  return base.map((point) => ({
    ...point,
    count: map.get(point.key) ?? map.get(point.key.slice(0, 7)) ?? 0,
  }));
}

/** Normalize postgres date_trunc output to series key */
export function normalizeBucketValue(raw: string, unit: TimeBucketUnit): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return bucketKey(d, unit);
}
