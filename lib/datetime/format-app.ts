/**
 * App display timezone — Gud Game operates primarily in Indonesia (WIB).
 * Always format admin/user-facing absolute times in this zone for consistency.
 */
export const APP_DISPLAY_TIME_ZONE = "Asia/Jakarta";

/** Parse API/DB timestamps into a valid Date (handles ISO and naive PG strings). */
export function parseAppDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Naive "YYYY-MM-DD HH:mm:ss[.sss]" from drivers — treat as UTC wall clock.
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const parsed = new Date(`${normalized}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toAppIsoString(value: string | Date | null | undefined): string | null {
  const date = parseAppDate(value);
  return date ? date.toISOString() : null;
}

/** Absolute date+time for admin tables (WIB). */
export function formatAppDateTime(value: string | Date | null | undefined): string {
  const date = parseAppDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_DISPLAY_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

/** Date-only for compact admin columns (WIB). */
export function formatAppDate(value: string | Date | null | undefined): string {
  const date = parseAppDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_DISPLAY_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
