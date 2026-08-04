import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertCanManageRoster } from "@/lib/tournaments/manage-access";
import { listPartnerTournamentRegistrationsForManage } from "@/lib/partners/registration/service";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!tournament.partnerId) {
      throw new AppError("Not a partner tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    await assertCanManageRoster(tournament, userId, roles);

    const registrations = await listPartnerTournamentRegistrationsForManage(
      tournament.id,
      tournament.partnerId,
    );

    return jsonSuccess({ registrations });
  } catch (error) {
    return jsonError(error);
  }
}
