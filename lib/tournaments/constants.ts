import type { TournamentStatus, TournamentType } from "@/db/schema/tournaments";
import { isOfficialType } from "@/lib/tournaments/core/types";

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  official: "Official tournament",
  fun_match: "Fun Match — free community play",
};

export const OFFICIAL_BILLING_LABELS = {
  paid: "Paid",
  free: "Free",
} as const;

/** Public UI label for tournament type (handles legacy recreational). */
export function getPublicTournamentTypeLabel(type: string): string {
  if (isOfficialType(type)) return "Official";
  return "Fun Match";
}
