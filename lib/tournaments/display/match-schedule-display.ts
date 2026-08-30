/**
 * Venue TV match schedule — bucket carousel helpers.
 */

/** Fixtures shown per auto-slide page in each Now / Next / Later column. */
export const MATCH_SCHEDULE_SLIDE_SIZE = 5;

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
