import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostXenditAccounts } from "@/db/schema/host-xendit";
import { getHostBankPayoutProfile } from "@/lib/payments/host-payout/accounts";
import { normalizePayoutSchedule } from "@/lib/payments/host-payout/constants";
import {
  MIN_HOST_PAYOUT_DISBURSEMENT_IDR,
} from "@/lib/payments/host-payout/disbursement/constants";
import {
  getLastCompletedDisbursement,
  listPendingHostPayments,
} from "@/lib/payments/host-payout/disbursement/queries";
import {
  computeNextPayoutAt,
  isPayoutDue,
} from "@/lib/payments/host-payout/disbursement/schedule";
import type { HostPayoutSummaryView } from "@/lib/payments/host-payout/disbursement/types";
import { isXenPlatformEnabled } from "@/lib/payments/xenplatform/config";

export async function getHostPayoutSummary(hostUserId: string): Promise<HostPayoutSummaryView> {
  const profile = await getHostBankPayoutProfile(hostUserId);
  const schedule = normalizePayoutSchedule(profile.payoutSchedule);

  const [xenditRow] = await getDb()
    .select({ xenditAccountId: hostXenditAccounts.xenditAccountId })
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, hostUserId))
    .limit(1);

  const pendingPayments = await listPendingHostPayments(hostUserId);
  const pendingBalanceIdr = pendingPayments.reduce((sum, p) => sum + p.hostPayoutIdr, 0);

  const lastCompleted = await getLastCompletedDisbursement(hostUserId);
  const lastCompletedAt = lastCompleted?.completedAt ?? null;
  const due = isPayoutDue(schedule, lastCompletedAt);
  const nextPayoutAt = computeNextPayoutAt(schedule, lastCompletedAt);

  const lastDisbursement = lastCompleted
    ? {
        id: lastCompleted.id,
        amountIdr: lastCompleted.amountIdr,
        paymentCount: lastCompleted.paymentCount,
        payoutSchedule: normalizePayoutSchedule(lastCompleted.payoutSchedule),
        bankCode: lastCompleted.bankCode,
        maskedAccount: lastCompleted.maskedAccount,
        bankAccountHolder: lastCompleted.bankAccountHolder,
        status: lastCompleted.status,
        failureCode: lastCompleted.failureCode,
        failureReason: lastCompleted.failureReason,
        estimatedArrivalAt: lastCompleted.estimatedArrivalAt?.toISOString() ?? null,
        completedAt: lastCompleted.completedAt?.toISOString() ?? null,
        createdAt: lastCompleted.createdAt.toISOString(),
      }
    : null;

  return {
    payoutSchedule: schedule,
    pendingBalanceIdr,
    pendingPaymentCount: pendingPayments.length,
    isDue: due && pendingBalanceIdr >= MIN_HOST_PAYOUT_DISBURSEMENT_IDR,
    nextPayoutAt: nextPayoutAt?.toISOString() ?? null,
    lastDisbursement,
    minimumDisbursementIdr: MIN_HOST_PAYOUT_DISBURSEMENT_IDR,
    xenPlatformLinked: Boolean(xenditRow?.xenditAccountId) && isXenPlatformEnabled(),
    bankConfigured: profile.configured,
  };
}
