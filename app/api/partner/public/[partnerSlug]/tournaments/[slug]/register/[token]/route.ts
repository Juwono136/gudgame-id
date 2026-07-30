import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import {
  assertPartnerRegistrationOwnedByPartner,
  getPartnerRegistrationByToken,
} from "@/lib/partners/registration/service";

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

    return jsonSuccess({
      registration: {
        id: detail.registration.id,
        status: detail.registration.status,
        teamName: detail.registration.teamName,
        feeIdr: detail.registration.feeIdr,
        paymentDueAt: detail.registration.paymentDueAt?.toISOString() ?? null,
        confirmedAt: detail.registration.confirmedAt?.toISOString() ?? null,
        notes: detail.registration.notes,
      },
      members: detail.members.map((m) => ({
        fullName: m.fullName,
        isCaptain: m.isCaptain,
        roleOrder: m.roleOrder,
      })),
      payment: detail.payment
        ? {
            status: detail.payment.status,
            invoiceUrl: detail.payment.invoiceUrl,
            amountIdr: detail.payment.amountIdr,
          }
        : null,
      tournament: {
        name: tournament.name,
        slug: tournament.slug,
        venue: tournament.venue,
        startsAt: tournament.startsAt,
        endsAt: tournament.endsAt,
        sportName: tournament.sportName,
      },
      partner: { slug: partner.slug, displayName: partner.displayName },
      payUrl: partnerPublicRoutes.tournamentRegisterPay(partner.slug, tournament.slug, token),
      successUrl: partnerPublicRoutes.tournamentRegisterSuccess(partner.slug, tournament.slug, token),
      receiptUrl:
        detail.payment?.status === "paid"
          ? partnerPublicRoutes.tournamentRegisterReceipt(partner.slug, tournament.slug, token)
          : null,
      tournamentUrl: partnerPublicRoutes.tournament(partner.slug, tournament.slug),
    });
  } catch (error) {
    return jsonError(error);
  }
}
