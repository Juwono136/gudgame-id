import "server-only";

import { logger } from "@/lib/logger";
import { xenditRequest } from "@/lib/payments/xendit/client";

const log = logger.child({ module: "xendit-invoices" });

export type XenditInvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  category?: string;
};

export type CreateXenditInvoiceInput = {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  items?: XenditInvoiceItem[];
  metadata?: Record<string, string>;
  /** XenPlatform split rule — routes host payout on settlement */
  splitRuleId?: string;
};

export type XenditInvoiceResponse = {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  invoice_url: string;
  expiry_date?: string;
};

export async function createXenditInvoice(
  input: CreateXenditInvoiceInput,
): Promise<XenditInvoiceResponse> {
  const headers: Record<string, string> = {};
  if (input.splitRuleId) {
    headers["with-split-rule"] = input.splitRuleId;
  }

  const body = {
    external_id: input.externalId,
    amount: input.amount,
    payer_email: input.payerEmail,
    description: input.description,
    invoice_duration: 86400,
    success_redirect_url: input.successRedirectUrl,
    failure_redirect_url: input.failureRedirectUrl,
    currency: "IDR",
    items: input.items,
    metadata: input.metadata,
    should_send_email: true,
  };

  log.debug("Creating Xendit invoice", {
    externalId: input.externalId,
    amount: input.amount,
    hasSplitRule: Boolean(input.splitRuleId),
  });

  return xenditRequest<XenditInvoiceResponse>({
    path: "/v2/invoices",
    body,
    headers,
    operation: "create invoice",
  });
}
