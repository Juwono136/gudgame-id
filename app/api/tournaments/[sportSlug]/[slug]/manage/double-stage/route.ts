import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  buildDoubleStageOverview,
  initializeDoubleStageGroups,
} from "@/lib/tournaments/double-stage/service";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
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

    if (tournament.format !== "double_stage") {
      throw new AppError("Not a double stage tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    await assertTournamentManagePageAccess(tournament, userId, roles);
    if (tournament.status === "live") {
      await initializeDoubleStageGroups(tournament);
    }
    const overview = await buildDoubleStageOverview(tournament);

    return jsonSuccess({ overview });
  } catch (error) {
    return jsonError(error);
  }
}
