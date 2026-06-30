import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { finalizeBracketSeeding } from "@/lib/tournaments/brackets/finalize";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import { canManageBracketSetup } from "@/lib/tournaments/permissions";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

export async function POST(
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

    const grantRole = await getActiveAccessGrantRole(tournament.id, userId);
    if (!canManageBracketSetup(roles, tournament, userId, grantRole)) {
      throw new AppError("Only the tournament owner or invited staff can finalize seeding", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const result = await finalizeBracketSeeding(tournament);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
