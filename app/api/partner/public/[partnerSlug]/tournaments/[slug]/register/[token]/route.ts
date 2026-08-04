import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import {
  assertPartnerRegistrationOwnedByPartner,
  cancelPartnerGuestRegistrationByToken,
  getPartnerRegistrationByToken,
} from "@/lib/partners/registration/service";
import { getTrustedClientIp } from "@/lib/security/client-ip";

export const runtime = "nodejs";

async function resolvePartnerRegistrationContext(
  rawPartnerSlug: string,
  slug: string,
  token: string,
) {
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
  return { partner, tournament, detail };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string; token: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "general" });

    const { partnerSlug: rawPartnerSlug, slug, token } = await params;
    const { partner, tournament, detail } = await resolvePartnerRegistrationContext(
      rawPartnerSlug,
      slug,
      token,
    );

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
      },
      partner: { slug: partner.slug, displayName: partner.displayName },
      payUrl: partnerPublicRoutes.tournamentRegisterPay(partner.slug, tournament.slug, token),
      successUrl: partnerPublicRoutes.tournamentRegisterSuccess(partner.slug, tournament.slug, token),
      receiptUrl:
        detail.payment?.status === "paid"
          ? partnerPublicRoutes.tournamentRegisterReceipt(partner.slug, tournament.slug, token)
          : null,
      tournamentUrl: partnerPublicRoutes.tournament(partner.slug, tournament.slug),
      registerUrl: partnerPublicRoutes.tournamentRegister(partner.slug, tournament.slug),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Guest self-cancel (token-gated).
 * Unpaid paid-entry holds (`awaiting_payment`) and free entries awaiting curation (`registered`).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string; token: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "sensitive" });

    const { partnerSlug: rawPartnerSlug, slug, token } = await params;
    const { partner, tournament, detail } = await resolvePartnerRegistrationContext(
      rawPartnerSlug,
      slug,
      token,
    );

    const ip = getTrustedClientIp(request);
    await enforceRateLimit({
      key: `partner-register-cancel:${detail.registration.id}:${ip}`,
      limit: 8,
      windowSeconds: 60,
      failClosedInProduction: true,
    });

    await cancelPartnerGuestRegistrationByToken(token);

    return jsonSuccess({
      cancelled: true,
      registerUrl: partnerPublicRoutes.tournamentRegister(partner.slug, tournament.slug),
      tournamentUrl: partnerPublicRoutes.tournament(partner.slug, tournament.slug),
    });
  } catch (error) {
    return jsonError(error);
  }
}
