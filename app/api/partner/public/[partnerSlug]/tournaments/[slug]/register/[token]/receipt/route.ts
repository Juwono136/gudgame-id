import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import {
  assertPartnerRegistrationOwnedByPartner,
  getPartnerRegistrationByToken,
} from "@/lib/partners/registration/service";
import { getGuestPaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string; token: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "general" });

    const { partnerSlug: rawPartnerSlug, slug, token } = await params;
    const partnerSlug = normalizePartnerSlug(rawPartnerSlug);
    const partner = await getActivePartnerBySlug(partnerSlug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const tournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const detail = await getPartnerRegistrationByToken(token);
    if (!detail) {
      throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    assertPartnerRegistrationOwnedByPartner(detail.registration, partner, tournament);

    if (!detail.payment || detail.payment.status !== "paid") {
      throw new AppError("Receipt is not available yet — payment has not been completed.", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const invoice = await getGuestPaymentInvoiceDocument(detail.payment.id, detail.registration.id);
    return jsonSuccess(invoice);
  } catch (error) {
    return jsonError(error);
  }
}
