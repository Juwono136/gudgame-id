import "server-only";

import type { PaymentSplit } from "@/lib/tournaments/payments/split";
import { xenditRequest } from "@/lib/payments/xendit/client";

export type SplitRuleRoute = {
  flat_amount?: number;
  percent_amount?: number;
  currency: "IDR";
  destination_account_id: string;
  reference_id: string;
};

export type CreateSplitRuleInput = {
  name: string;
  description?: string;
  routes: SplitRuleRoute[];
};

export type XenditSplitRule = {
  id: string;
  name: string;
  routes: SplitRuleRoute[];
};

/** Build a single host payout route — percent is more reliable across invoice totals. */
export function buildHostSplitRoute(
  destinationAccountId: string,
  split: PaymentSplit,
  registrationId: string,
): SplitRuleRoute {
  const referenceId = `host-reg-${registrationId}`;
  const hostShare =
    split.totalChargeIdr > 0 ? split.hostPayoutIdr / split.totalChargeIdr : 0;
  const percent = Math.min(99.99, Math.round(hostShare * 10000) / 100);

  if (percent > 0 && percent < 100) {
    return {
      percent_amount: percent,
      currency: "IDR",
      destination_account_id: destinationAccountId,
      reference_id: referenceId,
    };
  }

  return {
    flat_amount: split.hostPayoutIdr,
    currency: "IDR",
    destination_account_id: destinationAccountId,
    reference_id: referenceId,
  };
}

export async function createSplitRule(input: CreateSplitRuleInput): Promise<XenditSplitRule> {
  return xenditRequest<XenditSplitRule>({
    path: "/split_rules",
    body: input,
    operation: "create split rule",
  });
}
