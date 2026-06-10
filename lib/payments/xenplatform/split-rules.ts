import "server-only";

import { xenditRequest } from "@/lib/payments/xendit/client";

export type SplitRuleRoute = {
  flat_amount: number;
  currency: "IDR";
  destination_account_id: string;
  reference_id: string;
};

export type CreateSplitRuleInput = {
  name: string;
  routes: SplitRuleRoute[];
};

export type XenditSplitRule = {
  id: string;
  name: string;
  routes: SplitRuleRoute[];
};

export async function createSplitRule(input: CreateSplitRuleInput): Promise<XenditSplitRule> {
  return xenditRequest<XenditSplitRule>({
    path: "/split_rules",
    body: input,
    operation: "create split rule",
  });
}
