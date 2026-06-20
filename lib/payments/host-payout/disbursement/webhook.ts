import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostPayoutDisbursements } from "@/db/schema/host-payout-disbursements";
import { logger } from "@/lib/logger";
import {
  getDisbursementByReferenceId,
  getDisbursementByXenditPayoutId,
  releaseDisbursementItems,
} from "@/lib/payments/host-payout/disbursement/queries";
import {
  handleFailedDisbursementCleanup,
  notifyHostPayoutDisbursementFailed,
  notifyHostPayoutDisbursementSucceeded,
} from "@/lib/payments/host-payout/disbursement/notify";
import {
  mapXenditStatusToDisbursementStatus,
  normalizeXenditPayoutStatus,
} from "@/lib/payments/xendit/payouts";

const log = logger.child({ module: "host-payout-webhook" });

export type XenditPayoutWebhook = {
  event?: string;
  id?: string;
  reference_id?: string;
  status?: string;
  failure_code?: string;
  failure_reason?: string;
  data?: {
    id?: string;
    reference_id?: string;
    status?: string;
    failure_code?: string;
    failure_reason?: string;
    estimated_arrival_time?: string;
  };
};

function extractPayoutPayload(body: XenditPayoutWebhook) {
  const payoutId = body.data?.id ?? body.id;
  const referenceId = body.data?.reference_id ?? body.reference_id;
  const status = body.data?.status ?? body.status;
  const failureCode = body.data?.failure_code ?? body.failure_code;
  const failureReason = body.data?.failure_reason ?? body.failure_reason;
  const estimatedArrival = body.data?.estimated_arrival_time;

  return { payoutId, referenceId, status, failureCode, failureReason, estimatedArrival };
}

export function isPayoutWebhookEvent(event: string | undefined): boolean {
  if (!event) return false;
  const lower = event.toLowerCase();
  return lower.includes("payout");
}

export async function handlePayoutWebhook(body: XenditPayoutWebhook): Promise<void> {
  const { payoutId, referenceId, status, failureCode, failureReason, estimatedArrival } =
    extractPayoutPayload(body);

  if (!payoutId && !referenceId) {
    log.warn("Payout webhook missing identifiers", { body });
    return;
  }

  const disbursement =
    (payoutId ? await getDisbursementByXenditPayoutId(payoutId) : null) ??
    (referenceId ? await getDisbursementByReferenceId(referenceId) : null);

  if (!disbursement) {
    log.warn("Payout webhook: no matching disbursement", { payoutId, referenceId });
    return;
  }

  const normalized = normalizeXenditPayoutStatus(status);
  if (!normalized) {
    log.info("Payout webhook: unhandled status", { status, disbursementId: disbursement.id });
    return;
  }

  const mappedStatus = mapXenditStatusToDisbursementStatus(normalized);
  const now = new Date();
  const updates: Partial<typeof hostPayoutDisbursements.$inferInsert> = {
    status: mappedStatus,
    updatedAt: now,
    xenditPayoutId: payoutId ?? disbursement.xenditPayoutId,
    failureCode: failureCode ?? null,
    failureReason: failureReason ?? null,
  };

  if (estimatedArrival) {
    updates.estimatedArrivalAt = new Date(estimatedArrival);
  }

  if (mappedStatus === "succeeded") {
    updates.completedAt = now;
  }

  const [updated] = await getDb()
    .update(hostPayoutDisbursements)
    .set(updates)
    .where(eq(hostPayoutDisbursements.id, disbursement.id))
    .returning();

  if (!updated) return;

  if (mappedStatus === "succeeded" && disbursement.status !== "succeeded") {
    await notifyHostPayoutDisbursementSucceeded(updated);
    log.info("Disbursement succeeded", { disbursementId: updated.id });
    return;
  }

  if (
    (mappedStatus === "failed" || mappedStatus === "reversed" || mappedStatus === "cancelled") &&
    disbursement.status !== mappedStatus
  ) {
    await handleFailedDisbursementCleanup(updated.id);
    await notifyHostPayoutDisbursementFailed(updated);
    log.warn("Disbursement failed", {
      disbursementId: updated.id,
      status: mappedStatus,
      failureCode,
    });
  }
}
