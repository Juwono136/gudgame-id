export {
  getPublicTournamentTypeLabel,
  OFFICIAL_BILLING_LABELS,
  TOURNAMENT_TYPE_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/tournaments/constants";

import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/constants";

export function getOfficialBillingLabel(
  billing: string | null | undefined,
): string {
  if (billing === "free") return OFFICIAL_BILLING_LABELS.free;
  if (billing === "paid") return OFFICIAL_BILLING_LABELS.paid;
  return OFFICIAL_BILLING_LABELS.paid;
}

export function getPhaseLabel(phase: string): string {
  switch (phase) {
    case "live":
      return "Live";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Upcoming";
  }
}
