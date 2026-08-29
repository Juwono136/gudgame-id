import type { TournamentCourtView } from "@/hooks/use-tournament-courts";

type CourtLike = Pick<TournamentCourtView, "id" | "name" | "courtNumber"> & {
  activeMatchId?: string | null;
};

/**
 * Reject labels that look like tournament status lines (e.g. "Kita Test · Live"),
 * which must never appear in the Court footer cell.
 */
export function isPlausibleCourtLabel(label: string | null | undefined): boolean {
  const t = label?.trim() ?? "";
  if (!t) return false;
  if (/·\s*live\s*$/i.test(t)) return false;
  if (/^(official|fun\s*match)\s+live$/i.test(t)) return false;
  return true;
}

/** Resolve a human-readable court label from id, courts list, or fallback index. */
export function resolveCourtLabel(
  courtId: string | null | undefined,
  courts: CourtLike[],
  fallbackIndex?: number,
): string {
  if (courtId) {
    const court = courts.find((c) => c.id === courtId);
    if (court?.name?.trim() && isPlausibleCourtLabel(court.name)) {
      return court.name.trim();
    }
    if (court?.courtNumber != null) return `Court ${court.courtNumber}`;
  }
  if (fallbackIndex != null && fallbackIndex >= 0) {
    const byIndex = courts[fallbackIndex];
    if (byIndex?.name?.trim() && isPlausibleCourtLabel(byIndex.name)) {
      return byIndex.name.trim();
    }
    if (byIndex?.courtNumber != null) return `Court ${byIndex.courtNumber}`;
    return `Court ${fallbackIndex + 1}`;
  }
  if (courts.length === 1) {
    const only = courts[0];
    if (only?.name?.trim() && isPlausibleCourtLabel(only.name)) {
      return only.name.trim();
    }
    if (only?.courtNumber != null) return `Court ${only.courtNumber}`;
  }
  return "Court —";
}

type MatchCourtRef = {
  id: string;
  courtId?: string | null;
};

/**
 * Resolve the court label for a featured live match.
 * Prefer match.courtId → court.activeMatchId → index fallback.
 * Never returns a tournament subtitle-like string.
 */
export function resolveFeaturedCourtLabel(options: {
  match: MatchCourtRef | null | undefined;
  courts: CourtLike[];
  activeMatches: MatchCourtRef[];
  pinnedLabel?: string | null;
}): string {
  const { match, courts, activeMatches, pinnedLabel } = options;
  if (pinnedLabel?.trim() && isPlausibleCourtLabel(pinnedLabel)) {
    return pinnedLabel.trim();
  }
  if (!match) return "Court —";

  if (match.courtId) {
    const fromId = resolveCourtLabel(match.courtId, courts);
    if (fromId !== "Court —") return fromId;
  }

  const hosting = courts.find((c) => c.activeMatchId === match.id);
  if (hosting) {
    if (hosting.name?.trim() && isPlausibleCourtLabel(hosting.name)) {
      return hosting.name.trim();
    }
    if (hosting.courtNumber != null) return `Court ${hosting.courtNumber}`;
  }

  const idx = activeMatches.findIndex((m) => m.id === match.id);
  return resolveCourtLabel(null, courts, idx >= 0 ? idx : 0);
}
