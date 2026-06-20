import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  hostPayoutDisbursementItems,
  hostPayoutDisbursements,
} from "@/db/schema/host-payout-disbursements";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  buildDisbursementReferenceId,
  MIN_HOST_PAYOUT_DISBURSEMENT_IDR,
} from "@/lib/payments/host-payout/disbursement/constants";
import {
  getLastCompletedDisbursement,
  hasActiveDisbursementForReference,
  listPendingHostPayments,
  releaseDisbursementItems,
  type HostPayoutCandidate,
} from "@/lib/payments/host-payout/disbursement/queries";
import { isPayoutDue } from "@/lib/payments/host-payout/disbursement/schedule";
import type { HostPayoutJobHostResult } from "@/lib/payments/host-payout/disbursement/types";
import { isXenditConfigured } from "@/lib/payments/xendit/client";
import {
  createXenditPayout,
  mapXenditStatusToDisbursementStatus,
} from "@/lib/payments/xendit/payouts";
import { isXenPlatformEnabled } from "@/lib/payments/xenplatform/config";
import { formatScheduleLabel } from "@/lib/payments/host-payout/disbursement/schedule";

const log = logger.child({ module: "host-payout-processor" });

function periodBounds(payments: { paidAt: Date | null; createdAt: Date }[]) {
  const dates = payments
    .map((p) => p.paidAt ?? p.createdAt)
    .filter((d): d is Date => d instanceof Date);
  if (dates.length === 0) return { periodStart: null, periodEnd: null };
  dates.sort((a, b) => a.getTime() - b.getTime());
  return { periodStart: dates[0]!, periodEnd: dates[dates.length - 1]! };
}

export async function processHostScheduledPayout(
  candidate: HostPayoutCandidate,
  now: Date = new Date(),
): Promise<HostPayoutJobHostResult> {
  const { hostUserId, payoutSchedule, xenditAccountId, primaryBank } = candidate;

  if (!isXenditConfigured() || !isXenPlatformEnabled()) {
    return {
      hostUserId,
      outcome: "skipped",
      reason: "XenPlatform payouts not configured",
    };
  }

  const lastCompleted = await getLastCompletedDisbursement(hostUserId);
  if (!isPayoutDue(payoutSchedule, lastCompleted?.completedAt ?? null, now)) {
    return { hostUserId, outcome: "skipped", reason: "Schedule not due" };
  }

  const pendingPayments = await listPendingHostPayments(hostUserId);
  const totalIdr = pendingPayments.reduce((sum, p) => sum + p.hostPayoutIdr, 0);

  if (pendingPayments.length === 0) {
    return { hostUserId, outcome: "skipped", reason: "No pending earnings" };
  }

  if (totalIdr < MIN_HOST_PAYOUT_DISBURSEMENT_IDR) {
    return {
      hostUserId,
      outcome: "skipped",
      reason: `Below minimum (${MIN_HOST_PAYOUT_DISBURSEMENT_IDR})`,
    };
  }

  const referenceId = buildDisbursementReferenceId(hostUserId, payoutSchedule, now);
  if (await hasActiveDisbursementForReference(referenceId)) {
    return { hostUserId, outcome: "skipped", reason: "Already processed today" };
  }

  const { periodStart, periodEnd } = periodBounds(pendingPayments);
  const db = getDb();

  const [disbursement] = await db
    .insert(hostPayoutDisbursements)
    .values({
      hostUserId,
      referenceId,
      amountIdr: totalIdr,
      paymentCount: pendingPayments.length,
      payoutSchedule,
      bankCode: primaryBank.bankCode,
      maskedAccount: primaryBank.maskedAccount,
      bankAccountHolder: primaryBank.bankAccountHolder,
      status: "pending",
      periodStart,
      periodEnd,
    })
    .returning();

  if (!disbursement) {
    throw new AppError("Could not create disbursement record", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  try {
    await db.insert(hostPayoutDisbursementItems).values(
      pendingPayments.map((p) => ({
        disbursementId: disbursement.id,
        tournamentPaymentId: p.paymentId,
        amountIdr: p.hostPayoutIdr,
      })),
    );

    const payout = await createXenditPayout({
      referenceId,
      amountIdr: totalIdr,
      channelCode: primaryBank.bankCode,
      accountNumber: primaryBank.bankAccountNumber,
      accountHolderName: primaryBank.bankAccountHolder,
      description: `TandingBase ${formatScheduleLabel(payoutSchedule)} tournament payout`,
      forUserId: xenditAccountId,
      idempotencyKey: referenceId,
    });

    const mappedStatus = mapXenditStatusToDisbursementStatus(payout.status);
    const estimatedArrival = payout.estimated_arrival_time
      ? new Date(payout.estimated_arrival_time)
      : null;

    await db
      .update(hostPayoutDisbursements)
      .set({
        xenditPayoutId: payout.id,
        status: mappedStatus,
        estimatedArrivalAt: estimatedArrival,
        metadata: { xenditResponse: payout },
        updatedAt: new Date(),
      })
      .where(eq(hostPayoutDisbursements.id, disbursement.id));

    log.info("Host scheduled payout initiated", {
      hostUserId,
      disbursementId: disbursement.id,
      amountIdr: totalIdr,
      xenditPayoutId: payout.id,
    });

    return {
      hostUserId,
      outcome: "processed",
      disbursementId: disbursement.id,
      amountIdr: totalIdr,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await db
      .update(hostPayoutDisbursements)
      .set({
        status: "failed",
        failureReason: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(hostPayoutDisbursements.id, disbursement.id));

    await releaseDisbursementItems(disbursement.id);

    log.error("Host scheduled payout failed", {
      hostUserId,
      disbursementId: disbursement.id,
      error: message,
    });

    return {
      hostUserId,
      outcome: "failed",
      reason: message,
      disbursementId: disbursement.id,
    };
  }
}
