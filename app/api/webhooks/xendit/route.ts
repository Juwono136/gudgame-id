import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { verifyXenditWebhookToken } from "@/lib/payments/xendit";
import {
  handleSplitPaymentWebhook,
  type XenditSplitPaymentWebhook,
} from "@/lib/payments/xenplatform/split-webhook";
import {
  confirmPaymentByInvoiceId,
  failPaymentByInvoiceId,
} from "@/lib/tournaments/registration/service";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xendit-webhook" });

export const runtime = "nodejs";

type XenditInvoiceWebhook = {
  id?: string;
  external_id?: string;
  status?: string;
};

export async function POST(request: Request) {
  try {
    await guardApiRequest(request, { tier: "webhook", skipOriginCheck: true });
    await enforceRateLimit({
      key: "xendit-webhook",
      limit: 120,
      windowSeconds: 60,
      failClosedInProduction: true,
    });

    const token = request.headers.get("x-callback-token");
    if (!verifyXenditWebhookToken(token)) {
      throw new AppError("Invalid webhook token", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const body = (await request.json()) as XenditInvoiceWebhook & XenditSplitPaymentWebhook;

    if (body.event === "split.payment") {
      await handleSplitPaymentWebhook(body);
      return jsonSuccess({ received: true });
    }

    const invoiceId = body.id;
    const status = body.status?.toUpperCase();

    log.info("Xendit webhook received", { invoiceId, status, externalId: body.external_id });

    if (invoiceId && status === "PAID") {
      await confirmPaymentByInvoiceId(invoiceId);
    } else if (invoiceId && status === "EXPIRED") {
      await failPaymentByInvoiceId(invoiceId, "expired");
    } else if (invoiceId && (status === "FAILED" || status === "VOIDED")) {
      await failPaymentByInvoiceId(invoiceId, "failed");
    }

    return jsonSuccess({ received: true });
  } catch (error) {
    log.error("Webhook processing failed", { error });
    return jsonError(error);
  }
}
