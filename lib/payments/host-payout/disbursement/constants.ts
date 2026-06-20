import type { PayoutSchedule } from "@/lib/payments/host-payout/constants";
import { disbursementStatusBadgeClass } from "@/lib/styles/status-badges";

/** Minimum accumulated host earnings before a bank disbursement is triggered */
export const MIN_HOST_PAYOUT_DISBURSEMENT_IDR = 10_000;

/** Disbursement statuses that block a payment from being included in a new batch */
export const BLOCKING_DISBURSEMENT_STATUSES = [
  "pending",
  "accepted",
  "requested",
  "succeeded",
] as const;

export const DISBURSEMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  accepted: "Processing",
  requested: "Processing",
  succeeded: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  reversed: "Reversed",
};

export const DISBURSEMENT_STATUS_STYLES = disbursementStatusBadgeClass;

export function buildDisbursementReferenceId(
  hostUserId: string,
  schedule: PayoutSchedule,
  runDate: Date,
): string {
  const day = runDate.toISOString().slice(0, 10);
  const shortHost = hostUserId.replace(/-/g, "").slice(0, 12);
  return `tb-payout-${shortHost}-${schedule}-${day}`;
}
