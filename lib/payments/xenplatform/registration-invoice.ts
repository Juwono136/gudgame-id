import "server-only";

import { AppError } from "@/lib/errors";
import { createXenditInvoice, type CreateXenditInvoiceInput } from "@/lib/payments/xendit/invoices";
import { isXenPlatformEnabled } from "@/lib/payments/xenplatform/config";
import { getActiveHostXenditAccount } from "@/lib/payments/xenplatform/host-account-service";
import { createSplitRule } from "@/lib/payments/xenplatform/split-rules";
import type { PaymentSplit } from "@/lib/tournaments/payments/split";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xenplatform-registration-invoice" });

export type RegistrationInvoiceContext = {
  tournamentId: number;
  registrationId: number;
  hostUserId: string | null;
  split: PaymentSplit;
};

export type RegistrationInvoiceResult = {
  invoice: Awaited<ReturnType<typeof createXenditInvoice>>;
  splitRuleId: string | null;
  hostPayoutStatus: "pending" | "skipped";
};

export async function createRegistrationInvoiceWithSplit(
  input: CreateXenditInvoiceInput,
  context: RegistrationInvoiceContext,
): Promise<RegistrationInvoiceResult> {
  if (!isXenPlatformEnabled()) {
    const invoice = await createXenditInvoice(input);
    return { invoice, splitRuleId: null, hostPayoutStatus: "skipped" };
  }

  if (!context.hostUserId) {
    throw new AppError(
      "This tournament host has not been assigned. Paid registration is unavailable.",
      { code: "HOST_PAYOUT_NOT_CONFIGURED", statusCode: 503 },
    );
  }

  const hostAccount = await getActiveHostXenditAccount(context.hostUserId);
  if (!hostAccount) {
    log.warn("Host XenPlatform not active — invoice without split (fees stay on master account)", {
      hostUserId: context.hostUserId,
      registrationId: context.registrationId,
    });
    const invoice = await createXenditInvoice(input);
    return { invoice, splitRuleId: null, hostPayoutStatus: "skipped" };
  }

  if (context.split.hostPayoutIdr <= 0) {
    const invoice = await createXenditInvoice(input);
    return { invoice, splitRuleId: null, hostPayoutStatus: "skipped" };
  }

  const splitRule = await createSplitRule({
    name: `tnd-${context.tournamentId}-reg-${context.registrationId}`,
    routes: [
      {
        flat_amount: context.split.hostPayoutIdr,
        currency: "IDR",
        destination_account_id: hostAccount.xenditAccountId,
        reference_id: `host_${context.registrationId}`,
      },
    ],
  });

  log.info("Split rule created for registration", {
    registrationId: context.registrationId,
    splitRuleId: splitRule.id,
    hostPayoutIdr: context.split.hostPayoutIdr,
  });

  const invoice = await createXenditInvoice({
    ...input,
    splitRuleId: splitRule.id,
    metadata: {
      ...input.metadata,
      xenditSplitRuleId: splitRule.id,
      hostXenditAccountId: hostAccount.xenditAccountId,
    },
  });

  return {
    invoice,
    splitRuleId: splitRule.id,
    hostPayoutStatus: "pending",
  };
}
