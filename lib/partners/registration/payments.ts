import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerPlayers, partnerTournamentRegistrations } from "@/db/schema/partner-players";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { AppError, isAppError } from "@/lib/errors";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { createRegistrationInvoiceWithSplit } from "@/lib/payments/xenplatform/registration-invoice";
import { createCallbackVirtualAccount } from "@/lib/payments/xendit/virtual-accounts";
import { createQrisPayment } from "@/lib/payments/xendit/qrcode";
import { getPlatformPaymentSettings } from "@/lib/tournaments/payments/platform-settings";
import { calculateOfficialPaymentSplit } from "@/lib/tournaments/payments/split";
import type {
  CheckoutPaymentMethod,
  PaymentInstructions,
} from "@/lib/tournaments/payments/checkout-methods";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type { CheckoutPaymentMethod, PaymentInstructions };

const BANK_CODES: Record<string, string> = {
  BCA: "BCA",
  MANDIRI: "MANDIRI",
  BNI: "BNI",
  BRI: "BRI",
  PERMATA: "PERMATA",
};

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type PartnerInvoiceRegistration = {
  id: string;
  teamName: string;
  /** Plaintext token — only available right after creation, never re-derivable from the hash. */
  accessTokenPlain: string;
};

/** Mirrors issueRegistrationInvoice but keyed on partnerRegistrationId (guest, no Gud Game user). */
export async function issuePartnerRegistrationInvoice(
  tournament: TournamentDetail,
  registration: PartnerInvoiceRegistration,
  captainEmail: string,
  fee: number,
): Promise<{ paymentId: string; invoiceUrl: string; amountIdr: number }> {
  if (!tournament.partnerSlug) {
    throw new AppError("Partner tournament is missing its slug", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  const db = getDb();
  const settings = await getPlatformPaymentSettings();
  const split = calculateOfficialPaymentSplit(fee, settings);
  const externalId = `tnd-${tournament.id}-preg-${registration.id}`;

  const successPath = partnerPublicRoutes.tournamentRegisterSuccess(
    tournament.partnerSlug,
    tournament.slug,
    registration.accessTokenPlain,
  );
  const failurePath = `${partnerPublicRoutes.tournamentRegisterPay(
    tournament.partnerSlug,
    tournament.slug,
    registration.accessTokenPlain,
  )}?failed=1`;

  const { invoice, splitRuleId, hostPayoutStatus } = await createRegistrationInvoiceWithSplit(
    {
      externalId,
      amount: split.totalChargeIdr,
      payerEmail: captainEmail,
      description: `${tournament.name} — guest team registration`,
      successRedirectUrl: `${appBaseUrl()}${successPath}`,
      failureRedirectUrl: `${appBaseUrl()}${failurePath}`,
      shouldSendEmail: false,
      items: [
        {
          name: "Tournament registration",
          quantity: 1,
          price: split.registrationFeeIdr,
        },
        ...(split.processingFeeIdr > 0
          ? [
              {
                name: "Processing fee",
                quantity: 1,
                price: split.processingFeeIdr,
              },
            ]
          : []),
      ],
      metadata: {
        tournamentId: String(tournament.id),
        partnerRegistrationId: String(registration.id),
        platformFeeIdr: String(split.platformFeeIdr),
        hostPayoutIdr: String(split.hostPayoutIdr),
      },
    },
    {
      tournamentId: tournament.id,
      registrationId: registration.id,
      hostUserId: tournament.createdBy,
      split,
    },
  );

  const [existingPayment] = await db
    .select({ id: tournamentPayments.id })
    .from(tournamentPayments)
    .where(eq(tournamentPayments.partnerRegistrationId, registration.id))
    .limit(1);

  if (existingPayment) {
    await db
      .update(tournamentPayments)
      .set({
        xenditInvoiceId: invoice.id,
        xenditExternalId: externalId,
        amountIdr: split.totalChargeIdr,
        platformFeeIdr: split.platformFeeIdr,
        hostPayoutIdr: split.hostPayoutIdr,
        processingFeeIdr: split.processingFeeIdr,
        status: "pending",
        invoiceUrl: invoice.invoice_url,
        xenditSplitRuleId: splitRuleId,
        hostPayoutStatus,
        metadata: { split, xenPlatform: Boolean(splitRuleId) },
      })
      .where(eq(tournamentPayments.id, existingPayment.id));

    return {
      paymentId: existingPayment.id,
      invoiceUrl: invoice.invoice_url,
      amountIdr: split.totalChargeIdr,
    };
  }

  const [payment] = await db
    .insert(tournamentPayments)
    .values({
      tournamentId: tournament.id,
      registrationId: null,
      partnerRegistrationId: registration.id,
      payerUserId: null,
      xenditInvoiceId: invoice.id,
      xenditExternalId: externalId,
      amountIdr: split.totalChargeIdr,
      platformFeeIdr: split.platformFeeIdr,
      hostPayoutIdr: split.hostPayoutIdr,
      processingFeeIdr: split.processingFeeIdr,
      status: "pending",
      invoiceUrl: invoice.invoice_url,
      xenditSplitRuleId: splitRuleId,
      hostPayoutStatus,
      metadata: { split, xenPlatform: Boolean(splitRuleId) },
    })
    .returning();

  if (!payment) {
    throw new AppError("Could not record payment", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return { paymentId: payment.id, invoiceUrl: invoice.invoice_url, amountIdr: split.totalChargeIdr };
}

/**
 * Copy of initiateCheckoutPayment scoped to guest (partner) registrations.
 * No user-auth check — the caller already validated the access token.
 */
export async function initiatePartnerCheckoutPayment(
  tournament: TournamentDetail,
  registrationId: string,
  accessTokenPlain: string,
  method: CheckoutPaymentMethod,
  defaultBank = "BCA",
): Promise<PaymentInstructions> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.id, registrationId))
    .limit(1);

  if (!registration || registration.tournamentId !== tournament.id) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status !== "awaiting_payment") {
    throw new AppError("Registration is not awaiting payment", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.partnerRegistrationId, registrationId))
    .limit(1);

  if (!payment) {
    throw new AppError("Payment record not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (payment.status === "paid") {
    throw new AppError("Payment already completed", { code: "CONFLICT", statusCode: 409 });
  }

  const externalId = payment.xenditExternalId ?? `tnd-${tournament.id}-preg-${registrationId}`;
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
          partnerRegistrationId: String(registrationId),
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
          accountName: existing.accountName ?? "GUD GAME",
        },
      };
    }

    const va = await createCallbackVirtualAccount({
      externalId: `${externalId}-va`,
      bankCode,
      name: "GUD GAME",
      expectedAmount: amount,
      metadata: {
        partnerRegistrationId: String(registrationId),
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
  let captainEmail: string | null = null;
  if (registration.captainPartnerPlayerId) {
    const [captain] = await db
      .select({ email: partnerPlayers.email })
      .from(partnerPlayers)
      .where(eq(partnerPlayers.id, registration.captainPartnerPlayerId))
      .limit(1);
    captainEmail = captain?.email ?? null;
  }

  if (!captainEmail) {
    throw new AppError("Captain email is required for payment", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const fee = registration.feeIdr ?? tournament.registrationFeeIdr ?? 0;
  const { invoiceUrl } = await issuePartnerRegistrationInvoice(
    tournament,
    {
      id: registration.id,
      teamName: registration.teamName,
      accessTokenPlain,
    },
    captainEmail,
    fee,
  );

  return {
    method,
    amountIdr: amount,
    expiresAt: null,
    ewalletRedirectUrl: invoiceUrl,
  };
}
