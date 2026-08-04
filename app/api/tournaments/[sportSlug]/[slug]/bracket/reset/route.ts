import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { resetTournamentBracket } from "@/lib/tournaments/brackets/reset";
import { assertCanManageBracket } from "@/lib/tournaments/manage-access";
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

    await assertCanManageBracket(tournament, userId, roles);

    await resetTournamentBracket(tournament);
    return jsonSuccess({ reset: true });
  } catch (error) {
    return jsonError(error);
  }
}
