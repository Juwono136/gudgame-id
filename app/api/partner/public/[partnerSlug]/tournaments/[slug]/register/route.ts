import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getTrustedClientIp } from "@/lib/security/client-ip";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import { generateAccessToken } from "@/lib/partners/registration/tokens";
import { partnerGuestRegistrationSchema } from "@/lib/partners/registration/validation";
import { startPartnerGuestRegistration } from "@/lib/partners/registration/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string }> },
) {
  try {
    await guardApiRequest(request, { tier: "register" });

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
    const parsed = partnerGuestRegistrationSchema(tournament.playersPerTeam).safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid registration data", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { issues: parsed.error.flatten() },
      });
    }

    const ip = getTrustedClientIp(request);
    await enforceRateLimit({
      key: `partner-register:${parsed.data.captain.email.trim().toLowerCase()}:${ip}`,
      limit: 5,
      windowSeconds: 3600,
      failClosedInProduction: true,
    });

    const accessTokenPlain = generateAccessToken();
    const result = await startPartnerGuestRegistration(
      tournament,
      partner,
      parsed.data,
      accessTokenPlain,
    );

    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
