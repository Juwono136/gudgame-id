/**
 * Venue TV — fit how many carousel items fit in a measured viewport.
 * Shared by Official Gud Game and Partner white-label display presets
 * (match schedule, group stage, multi-court, leaderboard, knockout bracket).
 */

/**
 * Uniform scale so a fixed-size bracket tree fits inside the TV viewport.
 * Slight upscale allowed for small trees on large monitors; never crops.
 */
export function computeBracketFitScale(
  availWidthPx: number,
  availHeightPx: number,
  treeWidthPx: number,
  treeHeightPx: number,
  options?: { paddingPx?: number; minScale?: number; maxScale?: number },
): number {
  const padding = options?.paddingPx ?? 12;
  const minScale = options?.minScale ?? 0.22;
  const maxScale = options?.maxScale ?? 1.2;
  const w = Math.max(availWidthPx - padding * 2, 1);
  const h = Math.max(availHeightPx - padding * 2, 1);
  const tw = Math.max(treeWidthPx, 1);
  const th = Math.max(treeHeightPx, 1);
  const raw = Math.min(w / tw, h / th);
  if (!Number.isFinite(raw) || raw <= 0) return minScale;
  return Math.max(minScale, Math.min(maxScale, raw));
}

export function clampFitCount(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * How many equal items fit along one axis (height or width), accounting for gaps.
 */
export function fitCountAlongAxis(
  sizePx: number,
  itemPx: number,
  gapPx: number,
  min: number,
  max: number,
): number {
  const size = Math.max(0, sizePx);
  const item = Math.max(1, itemPx);
  const gap = Math.max(0, gapPx);
  if (size < item) return min;
  const count = Math.floor((size + gap) / (item + gap));
  return clampFitCount(count, min, max);
}

/** Match schedule column (vertical stack). */
export const MATCH_SCHEDULE_CARD_HEIGHT_PX = 96;
export const MATCH_SCHEDULE_CARD_GAP_PX = 8;
export const MATCH_SCHEDULE_MIN_PER_PAGE = 1;
export const MATCH_SCHEDULE_MAX_PER_PAGE = 8;
/** Soft default before first ResizeObserver measure. */
export const MATCH_SCHEDULE_DEFAULT_PER_PAGE = 4;

/** Done strip (horizontal). */
export const MATCH_SCHEDULE_STRIP_CARD_WIDTH_PX = 200;
export const MATCH_SCHEDULE_STRIP_GAP_PX = 8;
export const MATCH_SCHEDULE_STRIP_MIN = 1;
export const MATCH_SCHEDULE_STRIP_MAX = 6;
export const MATCH_SCHEDULE_STRIP_DEFAULT = 3;

export function fitMatchScheduleColumnPerPage(heightPx: number): number {
  return fitCountAlongAxis(
    heightPx,
    MATCH_SCHEDULE_CARD_HEIGHT_PX,
    MATCH_SCHEDULE_CARD_GAP_PX,
    MATCH_SCHEDULE_MIN_PER_PAGE,
    MATCH_SCHEDULE_MAX_PER_PAGE,
  );
}

export function fitMatchScheduleStripPerPage(widthPx: number): number {
  return fitCountAlongAxis(
    widthPx,
    MATCH_SCHEDULE_STRIP_CARD_WIDTH_PX,
    MATCH_SCHEDULE_STRIP_GAP_PX,
    MATCH_SCHEDULE_STRIP_MIN,
    MATCH_SCHEDULE_STRIP_MAX,
  );
}

/**
 * Group-stage pool cards per slide.
 * Large TV → 4 (2×2); medium → 2; narrow/short → 1.
 */
export function fitGroupStagePoolsPerSlide(widthPx: number, heightPx: number): number {
  if (widthPx >= 1100 && heightPx >= 480) return 4;
  if (widthPx >= 720 && heightPx >= 320) return 2;
  return 1;
}

/**
 * Live multi-court cards per slide.
 * Scales with monitor area so small TVs are not cramped.
 */
export function fitMultiCourtPerSlide(widthPx: number, heightPx: number): number {
  if (widthPx >= 1400 && heightPx >= 680) return 6;
  if (widthPx >= 1100 && heightPx >= 560) return 4;
  if (widthPx >= 780 && heightPx >= 420) return 2;
  return 1;
}

/** Leaderboard table body rows. */
export const LEADERBOARD_ROW_HEIGHT_PX = 42;
export const LEADERBOARD_CHROME_RESERVE_PX = 108;
export const LEADERBOARD_MIN_ROWS = 6;
export const LEADERBOARD_MAX_ROWS = 24;
export const LEADERBOARD_DEFAULT_ROWS = 12;

export function fitLeaderboardRowsPerPage(containerHeightPx: number): number {
  const available = Math.max(180, containerHeightPx - LEADERBOARD_CHROME_RESERVE_PX);
  return fitCountAlongAxis(
    available,
    LEADERBOARD_ROW_HEIGHT_PX,
    0,
    LEADERBOARD_MIN_ROWS,
    LEADERBOARD_MAX_ROWS,
  );
}
