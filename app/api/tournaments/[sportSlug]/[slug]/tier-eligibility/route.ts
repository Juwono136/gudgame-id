import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getTournamentAllowedTierLevels } from "@/lib/tournaments/settings";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { evaluateTournamentTierEligibility } from "@/lib/tournaments/tier-eligibility";
import { formatAllowedTierLevelsLabel } from "@/lib/tournaments/tier-restrictions";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const allowedTierLevels = getTournamentAllowedTierLevels(tournament);
    const session = await getServerSession();

    if (!session?.user?.id) {
      return jsonSuccess({
        restricted: allowedTierLevels != null,
        allowedTierLevels,
        allowedTierLabel: formatAllowedTierLevelsLabel(allowedTierLevels),
        playerTierLevel: null,
        playerTierLabel: null,
        eligible: allowedTierLevels == null,
        message: null,
        isAuthenticated: false,
      });
    }

    const tierEligibility = await evaluateTournamentTierEligibility(
      tournament,
      session.user.id,
    );

    return jsonSuccess({ ...tierEligibility, isAuthenticated: true });
  } catch (error) {
    return jsonError(error);
  }
}
