import type { TournamentCourtView } from "@/hooks/use-tournament-courts";

type CourtLike = Pick<TournamentCourtView, "id" | "name" | "courtNumber">;

/** Resolve a human-readable court label from id, courts list, or fallback index. */
export function resolveCourtLabel(
  courtId: string | null | undefined,
  courts: CourtLike[],
  fallbackIndex?: number,
): string {
  if (courtId) {
    const court = courts.find((c) => c.id === courtId);
    if (court?.name?.trim()) return court.name;
    if (court?.courtNumber != null) return `Court ${court.courtNumber}`;
  }
  if (fallbackIndex != null && fallbackIndex >= 0) {
    return `Court ${fallbackIndex + 1}`;
  }
  return "Court —";
}
