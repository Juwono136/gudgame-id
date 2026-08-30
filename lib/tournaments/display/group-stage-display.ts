/** Number of pool tables shown per venue TV carousel slide (2×2 grid). */
export const GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE = 4;

/** Auto-advance interval for group-stage TV carousel when multiple slides exist. */
export const GROUP_STAGE_DISPLAY_SLIDE_MS = 12_000;

export function chunkGroupsForDisplay<T>(
  groups: T[],
  perSlide = GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE,
): T[][] {
  if (!groups.length) return [];
  const size = Math.max(1, perSlide);
  const slides: T[][] = [];
  for (let i = 0; i < groups.length; i += size) {
    slides.push(groups.slice(i, i + size));
  }
  return slides;
}
