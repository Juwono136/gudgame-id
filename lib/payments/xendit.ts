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

import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xendit" });

function safeCompareToken(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyXenditWebhookToken(headerToken: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    log.warn("XENDIT_WEBHOOK_TOKEN not set — rejecting webhook");
    return false;
  }
  if (!headerToken) return false;
  return safeCompareToken(headerToken, expected);
}
