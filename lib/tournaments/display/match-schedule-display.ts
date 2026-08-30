/**
 * Venue TV match schedule — bucket carousel helpers.
 */

import {
  MATCH_SCHEDULE_DEFAULT_PER_PAGE,
  MATCH_SCHEDULE_MAX_PER_PAGE,
  MATCH_SCHEDULE_MIN_PER_PAGE,
} from "@/lib/tournaments/display/fit-capacity";

/** @deprecated Prefer measuring via fitMatchScheduleColumnPerPage — kept as soft default. */
export const MATCH_SCHEDULE_SLIDE_SIZE = MATCH_SCHEDULE_DEFAULT_PER_PAGE;

export const MATCH_SCHEDULE_SLIDE_MIN = MATCH_SCHEDULE_MIN_PER_PAGE;
export const MATCH_SCHEDULE_SLIDE_MAX = MATCH_SCHEDULE_MAX_PER_PAGE;

/** Auto-advance interval when a bucket has multiple pages. */
export const MATCH_SCHEDULE_SLIDE_MS = 12_000;

export function chunkSchedulePages<T>(
  items: T[],
  perPage = MATCH_SCHEDULE_SLIDE_SIZE,
): T[][] {
  if (!items.length) return [];
  const size = Math.max(1, perPage);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export function schedulePageCount(matchCount: number, perPage = MATCH_SCHEDULE_SLIDE_SIZE): number {
  if (matchCount <= 0) return 0;
  return Math.ceil(matchCount / Math.max(1, perPage));
}
