import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getServerSession } from "@/lib/auth/session";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { getViewerPartnerRegistrationStatus } from "@/lib/partners/registration/service";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partnerSlug: string; slug: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return jsonSuccess({
        status: "none",
        isRegistered: false,
        registrationId: null,
        teamId: null,
        isAuthenticated: false,
      });
    }

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

    const data = await getViewerPartnerRegistrationStatus({
      tournamentId: tournament.id,
      partnerId: partner.id,
      userEmail: session.user.email,
      userId: session.user.id,
    });

    return jsonSuccess(data);
  } catch (error) {
    return jsonError(error);
  }
}
