import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getTrustedClientIp } from "@/lib/security/client-ip";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import {
  assertPartnerRegistrationOwnedByPartner,
  getPartnerRegistrationByToken,
} from "@/lib/partners/registration/service";
import { initiatePartnerCheckoutPayment } from "@/lib/partners/registration/payments";
import { CHECKOUT_PAYMENT_METHODS } from "@/lib/tournaments/payments/checkout-methods";

export const runtime = "nodejs";

const methodIds = CHECKOUT_PAYMENT_METHODS.map((m) => m.id) as [string, ...string[]];

const bodySchema = z.object({
  method: z.enum(methodIds),
  defaultBank: z.string().trim().max(20).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string; token: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "sensitive" });

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

    const ip = getTrustedClientIp(request);
    await enforceRateLimit({
      key: `partner-register-pay:${detail.registration.id}:${ip}`,
      limit: 10,
      windowSeconds: 60,
    });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid payment method", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const instructions = await initiatePartnerCheckoutPayment(
      tournament,
      detail.registration.id,
      token,
      parsed.data.method as (typeof CHECKOUT_PAYMENT_METHODS)[number]["id"],
      parsed.data.defaultBank,
    );

    return jsonSuccess(instructions);
  } catch (error) {
    return jsonError(error);
  }
}
