import type { PayoutSchedule } from "@/lib/payments/host-payout/constants";

export type PendingHostPaymentRow = {
  paymentId: string;
  tournamentId: string;
  sportSlug: string;
  sportName: string;
  hostPayoutIdr: number;
  paidAt: Date | null;
  createdAt: Date;
};

export type PendingEarningsBySport = {
  sportSlug: string;
  sportName: string;
  amountIdr: number;
  paymentCount: number;
};

export type HostPayoutDisbursementView = {
  id: string;
  amountIdr: number;
  paymentCount: number;
  payoutSchedule: PayoutSchedule;
  bankCode: string;
  maskedAccount: string;
  bankAccountHolder: string;
  status: string;
  failureCode: string | null;
  failureReason: string | null;
  estimatedArrivalAt: string | null;
  completedAt: string | null;
  createdAt: string;
  sportNames: string[];
};

export type HostPayoutSummaryView = {
  payoutSchedule: PayoutSchedule;
  pendingBalanceIdr: number;
  pendingPaymentCount: number;
  isDue: boolean;
  nextPayoutAt: string | null;
  lastDisbursement: HostPayoutDisbursementView | null;
  minimumDisbursementIdr: number;
  xenPlatformLinked: boolean;
  bankConfigured: boolean;
  pendingBySport: PendingEarningsBySport[];
};

export type HostPayoutJobHostResult = {
  hostUserId: string;
  outcome: "skipped" | "processed" | "failed";
  reason?: string;
  disbursementId?: string;
  amountIdr?: number;
};

export type HostPayoutJobResult = {
  startedAt: string;
  finishedAt: string;
  hostsChecked: number;
  processed: number;
  skipped: number;
  failed: number;
  results: HostPayoutJobHostResult[];
};
