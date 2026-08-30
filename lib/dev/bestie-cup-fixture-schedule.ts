/**
 * Relative schedule for partner Bestie Cup dry-run seed (no DB / server-only deps).
 */

/** Hours between fixture start and end (same as historical dry-run window). */
export const BESTIE_CUP_FIXTURE_DURATION_MS = 12 * 60 * 60 * 1000;

/** Days ahead of seed time so the event stays safely in the future (status upcoming). */
export const BESTIE_CUP_FIXTURE_START_OFFSET_DAYS = 14;

/**
 * Relative schedule for each seed run — never a fixed calendar day, so status stays
 * `upcoming` (unless `--go-live` forces live).
 */
export function upcomingBestieCupFixtureWindow(now = new Date()): {
  startsAt: Date;
  endsAt: Date;
} {
  const startsAt = new Date(
    now.getTime() + BESTIE_CUP_FIXTURE_START_OFFSET_DAYS * 24 * 60 * 60 * 1000,
  );
  startsAt.setUTCMinutes(0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + BESTIE_CUP_FIXTURE_DURATION_MS);
  return { startsAt, endsAt };
}
