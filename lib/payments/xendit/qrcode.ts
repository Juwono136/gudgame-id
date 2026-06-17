import "server-only";

import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { xenditRequest } from "@/lib/payments/xendit/client";

const log = logger.child({ module: "xendit-qrcode" });

export type CreateQrisPaymentInput = {
  referenceId: string;
  amount: number;
  metadata?: Record<string, string>;
  callbackUrl?: string;
};

export type XenditQrCodeResponse = {
  id: string;
  reference_id: string;
  qr_string: string;
  amount: number;
  status: string;
  expires_at?: string;
};

export async function createQrisPayment(
  input: CreateQrisPaymentInput,
): Promise<XenditQrCodeResponse> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const callbackUrl = input.callbackUrl ?? `${appUrl}/api/webhooks/xendit`;

  // Xendit QRIS requires a public HTTPS webhook URL (uses NEXT_PUBLIC_APP_URL).
  if (!/^https:\/\//i.test(callbackUrl) || /localhost|127\.0\.0\.1/i.test(callbackUrl)) {
    throw new AppError(
      "QRIS is available on your deployed site only. Use bank transfer or e-wallet while testing locally, or open checkout on your production URL.",
      { code: "SERVICE_UNAVAILABLE", statusCode: 503 },
    );
  }

  log.debug("Creating QRIS payment", { referenceId: input.referenceId, amount: input.amount });

  return xenditRequest<XenditQrCodeResponse>({
    path: "/qr_codes",
    body: {
      // QR Codes API expects external_id (legacy docs); response may include reference_id.
      external_id: input.referenceId,
      type: "DYNAMIC",
      currency: "IDR",
      amount: input.amount,
      callback_url: callbackUrl,
      metadata: input.metadata,
    },
    operation: "create QRIS",
  });
}

export async function getQrisPayment(qrId: string): Promise<XenditQrCodeResponse> {
  return xenditRequest<XenditQrCodeResponse>({
    method: "GET",
    path: `/qr_codes/${qrId}`,
    operation: "get QRIS",
  });
}
