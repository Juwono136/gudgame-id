import type { PayoutSchedule } from "@/lib/payments/host-payout/constants";

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

export const DISBURSEMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-300",
  accepted: "bg-sky-500/20 text-sky-300",
  requested: "bg-sky-500/20 text-sky-300",
  succeeded: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
  cancelled: "bg-slate-500/20 text-slate-400",
  reversed: "bg-amber-500/20 text-amber-300",
};

export function buildDisbursementReferenceId(
  hostUserId: string,
  schedule: PayoutSchedule,
  runDate: Date,
): string {
  const day = runDate.toISOString().slice(0, 10);
  const shortHost = hostUserId.replace(/-/g, "").slice(0, 12);
  return `tb-payout-${shortHost}-${schedule}-${day}`;
}
