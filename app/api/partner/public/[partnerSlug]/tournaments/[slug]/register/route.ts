import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getTrustedClientIp } from "@/lib/security/client-ip";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import { getPartnerPlayerSessionForSlug } from "@/lib/partners/auth/session";
import { generateAccessToken } from "@/lib/partners/registration/tokens";
import { partnerPhoneForAutofill } from "@/lib/partners/registration/phone";
import { partnerGuestRegistrationSchema } from "@/lib/partners/registration/validation";
import { startPartnerGuestRegistration } from "@/lib/partners/registration/service";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string }> },
) {
  try {
    // Venue desks often share one IP — do not use the strict account-signup "register" tier.
    await guardApiRequest(request, { tier: "partnerRegister" });

    const { partnerSlug: rawPartnerSlug, slug } = await params;
    const partnerSlug = normalizePartnerSlug(rawPartnerSlug);
    const partner = await getActivePartnerBySlug(partnerSlug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const tournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
    if (!tournament || tournament.status === "draft") {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const body = await request.json();
    const memberSession = await getPartnerPlayerSessionForSlug(partner.slug, request);
    const sessionEmail = memberSession?.session.email?.trim().toLowerCase() ?? null;
    const sessionPlayerId = memberSession?.session.playerId ?? null;
    const bodyEmail =
      typeof body?.captain?.email === "string"
        ? body.captain.email.trim().toLowerCase()
        : "";
    const sessionMatchesCaptain =
      Boolean(sessionPlayerId) &&
      Boolean(sessionEmail) &&
      (!bodyEmail || bodyEmail === sessionEmail);

    // Trusted member path: override captain contacts from session (ignore forged body fields).
    const registrationBody = sessionMatchesCaptain && memberSession
      ? {
          ...body,
          captain: {
            fullName: memberSession.session.displayName,
            email: memberSession.session.email,
            phone: partnerPhoneForAutofill(memberSession.session.phone) ?? "",
          },
        }
      : body;

    const parsed = partnerGuestRegistrationSchema(tournament.playersPerTeam, {
      memberCaptain: sessionMatchesCaptain,
    }).safeParse(registrationBody);
    if (!parsed.success) {
      throw zodErrorToAppError(parsed.error);
    }

    const ip = getTrustedClientIp(request);
    const captainEmail = parsed.data.captain.email.trim().toLowerCase();

    // Anti-spam: same captain email cannot flood a single tournament.
    await enforceRateLimit({
      key: `partner-register:captain:${tournament.id}:${captainEmail}`,
      limit: 5,
      windowSeconds: 3600,
      failClosedInProduction: true,
    });

    // Soft per-IP burst control (on top of partnerRegister hourly bucket).
    await enforceRateLimit({
      key: `partner-register:ip:${tournament.id}:${ip}`,
      limit: 30,
      windowSeconds: 600,
      failClosedInProduction: true,
    });

    const accessTokenPlain = generateAccessToken();
    const result = await startPartnerGuestRegistration(
      tournament,
      partner,
      {
        ...parsed.data,
        captain: {
          fullName: parsed.data.captain.fullName,
          email: parsed.data.captain.email,
          phone: parsed.data.captain.phone ?? "",
        },
      },
      accessTokenPlain,
      sessionMatchesCaptain
        ? {
            sessionPlayerId,
            sessionIdentityId: memberSession!.session.identityId,
          }
        : undefined,
    );

    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
