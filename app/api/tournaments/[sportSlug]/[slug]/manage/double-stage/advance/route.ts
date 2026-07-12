import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import {
  advanceDoubleStageToElimination,
  buildDoubleStageOverview,
} from "@/lib/tournaments/double-stage/service";
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

    if (tournament.format !== "double_stage") {
      throw new AppError("Not a double stage tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    await assertTournamentManagePageAccess(tournament, userId, roles);
    assertTournamentLiveForScoring(tournament);

    const result = await advanceDoubleStageToElimination(tournament);
    const overview = await buildDoubleStageOverview(
      (await getTournamentBySlug(sportSlug, slug))!,
    );

    return jsonSuccess({ ...result, overview });
  } catch (error) {
    return jsonError(error);
  }
}
