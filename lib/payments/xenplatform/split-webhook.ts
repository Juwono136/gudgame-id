import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xenplatform-split-webhook" });

export type XenditSplitPaymentWebhook = {
  event?: string;
  data?: {
    id?: string;
    split_rule_id?: string;
    payment_id?: string;
    payment_reference_id?: string;
    status?: string;
    amount?: number;
    failure_code?: string;
  };
};

export async function handleSplitPaymentWebhook(payload: XenditSplitPaymentWebhook): Promise<void> {
  if (payload.event !== "split.payment") return;

  const data = payload.data;
  if (!data?.split_rule_id) return;

  const status = data.status?.toUpperCase();
  const db = getDb();

  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.xenditSplitRuleId, data.split_rule_id))
    .limit(1);

  if (!payment) {
    log.warn("Split webhook: no payment matched split rule", {
      splitRuleId: data.split_rule_id,
      paymentId: data.payment_id,
    });
    return;
  }

  if (status === "COMPLETED") {
    await db
      .update(tournamentPayments)
      .set({
        hostPayoutStatus: "completed",
        hostPayoutCompletedAt: new Date(),
        metadata: {
          ...(typeof payment.metadata === "object" && payment.metadata !== null
            ? payment.metadata
            : {}),
          splitWebhook: data,
        },
      })
      .where(eq(tournamentPayments.id, payment.id));

    log.info("Host payout marked completed", {
      paymentId: payment.id,
      splitRuleId: data.split_rule_id,
    });
    return;
  }

  if (status === "FAILED") {
    await db
      .update(tournamentPayments)
      .set({
        hostPayoutStatus: "failed",
        metadata: {
          ...(typeof payment.metadata === "object" && payment.metadata !== null
            ? payment.metadata
            : {}),
          splitWebhook: data,
          splitFailureCode: data.failure_code,
        },
      })
      .where(eq(tournamentPayments.id, payment.id));

    log.error("Host payout split failed", {
      paymentId: payment.id,
      splitRuleId: data.split_rule_id,
      failureCode: data.failure_code,
    });
  }
}
