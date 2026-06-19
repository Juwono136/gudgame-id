import "server-only";

import { AppError } from "@/lib/errors";
import type { PaymentSplit } from "@/lib/tournaments/payments/split";
import { createXenditInvoice, type CreateXenditInvoiceInput } from "@/lib/payments/xendit/invoices";
import {
  isXenPlatformEnabled,
  isXenPlatformProductionSplitRequired,
} from "@/lib/payments/xenplatform/config";
import { getManagedSubAccount } from "@/lib/payments/xenplatform/accounts";
import { getActiveHostXenditAccount } from "@/lib/payments/xenplatform/host-account-service";
import { buildHostSplitRoute, createSplitRule } from "@/lib/payments/xenplatform/split-rules";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xenplatform-registration-invoice" });

export type RegistrationInvoiceContext = {
  tournamentId: string;
  registrationId: string;
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
  if (!hostAccount?.xenditAccountId) {
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

  let destinationAccountId: string;
  try {
    const remote = await getManagedSubAccount(hostAccount.xenditAccountId);
    const remoteStatus = remote.status?.toUpperCase() ?? "";
    if (remoteStatus !== "ACTIVE" && remoteStatus !== "LIVE") {
      log.warn("Host XenPlatform account not live — invoice without split", {
        hostUserId: context.hostUserId,
        registrationId: context.registrationId,
        remoteStatus,
      });
      const invoice = await createXenditInvoice(input);
      return { invoice, splitRuleId: null, hostPayoutStatus: "skipped" };
    }
    destinationAccountId = hostAccount.xenditAccountId;
  } catch (error) {
    log.warn("Could not verify host XenPlatform account — invoice without split", {
      hostUserId: context.hostUserId,
      registrationId: context.registrationId,
      error,
    });
    const invoice = await createXenditInvoice(input);
    return { invoice, splitRuleId: null, hostPayoutStatus: "skipped" };
  }

  const splitRoute = buildHostSplitRoute(
    destinationAccountId,
    context.split,
    context.registrationId,
  );

  let splitRuleId: string;
  try {
    const splitRule = await createSplitRule({
      name: `tnd-${context.tournamentId}-reg-${context.registrationId}`,
      description: `Host payout for registration ${context.registrationId}`,
      routes: [splitRoute],
    });
    splitRuleId = splitRule.id;

    log.info("Split rule created for registration", {
      registrationId: context.registrationId,
      splitRuleId,
      hostPayoutIdr: context.split.hostPayoutIdr,
      route: splitRoute,
    });
  } catch (error) {
    if (!isXenPlatformProductionSplitRequired()) {
      log.warn("Split rule failed in non-production — issuing invoice without host split", {
        registrationId: context.registrationId,
        error,
      });
      const invoice = await createXenditInvoice(input);
      return { invoice, splitRuleId: null, hostPayoutStatus: "skipped" };
    }
    throw error;
  }

  const invoice = await createXenditInvoice({
    ...input,
    splitRuleId,
    metadata: {
      ...input.metadata,
      xenditSplitRuleId: splitRuleId,
      hostXenditAccountId: destinationAccountId,
    },
  });

  return {
    invoice,
    splitRuleId,
    hostPayoutStatus: "pending",
  };
}
