import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { AppError, isAppError } from "@/lib/errors";
import { createCallbackVirtualAccount } from "@/lib/payments/xendit/virtual-accounts";
import { createQrisPayment } from "@/lib/payments/xendit/qrcode";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getRegistrationDetail } from "@/lib/tournaments/registration/service";

import type { CheckoutPaymentMethod, PaymentInstructions } from "@/lib/tournaments/payments/checkout-methods";

export type { CheckoutPaymentMethod, PaymentInstructions };

const BANK_CODES: Record<string, string> = {
  BCA: "BCA",
  MANDIRI: "MANDIRI",
  BNI: "BNI",
  BRI: "BRI",
  PERMATA: "PERMATA",
};

export async function initiateCheckoutPayment(
  tournament: TournamentDetail,
  registrationId: string,
  userId: string,
  method: CheckoutPaymentMethod,
  defaultBank = "BCA",
): Promise<PaymentInstructions> {
  const detail = await getRegistrationDetail(registrationId);
  if (!detail || detail.registeredByUserId !== userId) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (detail.status !== "pending_payment") {
    throw new AppError("Registration is not awaiting payment", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (detail.paymentStatus === "paid") {
    throw new AppError("Payment already completed", { code: "CONFLICT", statusCode: 409 });
  }

  const db = getDb();
  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.registrationId, registrationId))
    .limit(1);

  if (!payment) {
    throw new AppError("Payment record not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const externalId = payment.xenditExternalId ?? `tnd-${tournament.id}-reg-${registrationId}`;
  const amount = payment.amountIdr;
  const meta = { ...(payment.metadata as Record<string, unknown>) };

  if (method === "qris") {
    const existing = meta.qris as { qrId?: string; qrString?: string } | undefined;
    if (existing?.qrId && existing?.qrString && meta.paymentMethod === "qris") {
      return {
        method: "qris",
        amountIdr: amount,
        expiresAt: typeof meta.expiresAt === "string" ? meta.expiresAt : null,
        qris: { qrId: existing.qrId, qrString: existing.qrString },
      };
    }

    let qr;
    try {
      qr = await createQrisPayment({
        referenceId: `${externalId}-qris`,
        amount,
        metadata: {
          registrationId: String(registrationId),
          tournamentId: String(tournament.id),
          paymentId: String(payment.id),
        },
      });
    } catch (e) {
      if (isAppError(e) && e.code === "SERVICE_UNAVAILABLE") throw e;
      if (isAppError(e) && e.code === "PAYMENT_GATEWAY_ERROR") {
        throw new AppError(
          "QRIS could not be started. Check that QRIS is enabled in Xendit and that NEXT_PUBLIC_APP_URL points to your HTTPS site.",
          { code: "PAYMENT_GATEWAY_ERROR", statusCode: 502, cause: e },
        );
      }
      throw e;
    }

    const expiresAt = qr.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db
      .update(tournamentPayments)
      .set({
        metadata: {
          ...meta,
          paymentMethod: "qris",
          qris: { qrId: qr.id, qrString: qr.qr_string },
          expiresAt,
        },
      })
      .where(eq(tournamentPayments.id, payment.id));

    return {
      method: "qris",
      amountIdr: amount,
      expiresAt,
      qris: { qrId: qr.id, qrString: qr.qr_string },
    };
  }

  if (method === "bank_transfer") {
    const bankCode = BANK_CODES[defaultBank] ?? "BCA";
    const existing = meta.bankTransfer as
      | { accountNumber?: string; bankCode?: string; accountName?: string }
      | undefined;
    if (existing?.accountNumber && meta.paymentMethod === "bank_transfer") {
      return {
        method: "bank_transfer",
        amountIdr: amount,
        expiresAt: typeof meta.expiresAt === "string" ? meta.expiresAt : null,
        bankTransfer: {
          accountNumber: existing.accountNumber,
          bankCode: existing.bankCode ?? bankCode,
          accountName: existing.accountName ?? "TANDINGBASE",
        },
      };
    }

    const va = await createCallbackVirtualAccount({
      externalId: `${externalId}-va`,
      bankCode,
      name: "TANDINGBASE",
      expectedAmount: amount,
      metadata: {
        registrationId: String(registrationId),
        tournamentId: String(tournament.id),
        paymentId: String(payment.id),
      },
    });

    const expiresAt = va.expiration_date;
    await db
      .update(tournamentPayments)
      .set({
        metadata: {
          ...meta,
          paymentMethod: "bank_transfer",
          bankTransfer: {
            accountNumber: va.account_number,
            bankCode: va.bank_code,
            accountName: va.name,
            vaId: va.id,
          },
          expiresAt,
        },
      })
      .where(eq(tournamentPayments.id, payment.id));

    return {
      method: "bank_transfer",
      amountIdr: amount,
      expiresAt,
      bankTransfer: {
        accountNumber: va.account_number,
        bankCode: va.bank_code,
        accountName: va.name,
      },
    };
  }

  // E-wallet & card still use invoice with restricted methods (minimal hosted step)
  const { issueRegistrationInvoice } = await import("@/lib/tournaments/registration/service");
  const { getDb: getDb2 } = await import("@/db/client");
  const { user } = await import("@/db/schema/auth");
  const [dbUser] = await getDb2()
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser?.email) {
    throw new AppError("Email required for payment", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  const fee = tournament.registrationFeeIdr ?? 0;
  const { invoiceUrl } = await issueRegistrationInvoice(
    tournament,
    registrationId,
    userId,
    dbUser.email,
    fee,
    {
      paymentMethodLabel: method,
    },
  );

  return {
    method,
    amountIdr: amount,
    expiresAt: null,
    ewalletRedirectUrl: invoiceUrl,
  };
}
