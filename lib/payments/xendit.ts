import "server-only";

/**
 * @deprecated Import from `@/lib/payments/xendit/client` or `@/lib/payments/xendit/invoices`.
 * Re-exports kept for backward compatibility.
 */
export {
  isXenditConfigured,
  getXenditSecretKey,
  xenditAuthHeader,
  xenditRequest,
} from "@/lib/payments/xendit/client";

export {
  createXenditInvoice,
  type CreateXenditInvoiceInput,
  type XenditInvoiceItem,
  type XenditInvoiceResponse,
} from "@/lib/payments/xendit/invoices";

import { logger } from "@/lib/logger";

const log = logger.child({ module: "xendit" });

export function verifyXenditWebhookToken(headerToken: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    log.warn("XENDIT_WEBHOOK_TOKEN not set — rejecting webhook");
    return false;
  }
  return headerToken === expected;
}
