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
  confirmPaymentByRegistrationId,
  failPaymentByInvoiceId,
} from "@/lib/tournaments/registration/service";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xendit-webhook" });

export const runtime = "nodejs";

type XenditInvoiceWebhook = {
  id?: string;
  external_id?: string;
  reference_id?: string;
  status?: string;
  event?: string;
  data?: {
    reference_id?: string;
    external_id?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
};

function parseRegistrationIdFromReference(ref?: string | null): number | null {
  if (!ref) return null;
  const match = ref.match(/reg-(\d+)/);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

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

    if (body.event === "split.payment") {
      await handleSplitPaymentWebhook(body);
      return jsonSuccess({ received: true });
    }

    const qrRef = body.data?.reference_id ?? body.reference_id;
    const qrStatus = body.data?.status?.toUpperCase() ?? body.status?.toUpperCase();
    if (
      (body.event === "qr.payment" || body.event === "qr_code.payment") &&
      qrStatus === "COMPLETED"
    ) {
      const regId =
        Number(body.data?.metadata?.registrationId) ||
        parseRegistrationIdFromReference(qrRef);
      if (regId) await confirmPaymentByRegistrationId(regId);
      return jsonSuccess({ received: true });
    }

    const vaExternalId = body.external_id ?? body.data?.external_id;
    if (vaExternalId?.includes("-va") && (qrStatus === "PAID" || body.status?.toUpperCase() === "PAID")) {
      const regId = parseRegistrationIdFromReference(vaExternalId);
      if (regId) await confirmPaymentByRegistrationId(regId);
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
