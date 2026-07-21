import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import {
  buildDoubleStageOverview,
  reconcileDoubleStageGroups,
} from "@/lib/tournaments/double-stage/service";
import { shouldExposeGroupStagePublicData } from "@/lib/tournaments/lifecycle-guards";
import { getTournamentBySlug } from "@/lib/tournaments/service";

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

    if (!shouldExposeGroupStagePublicData(tournament)) {
      throw new AppError("Not a double stage tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    await reconcileDoubleStageGroups(tournament);
    const overview = await buildDoubleStageOverview(tournament);

    return jsonSuccess({
      phase: overview.phase,
      groups: overview.groups,
      knockoutReady: overview.knockoutReady,
      allGroupMatchesCompleted: overview.allGroupMatchesCompleted,
      qualifiedCount: overview.qualifiedCount,
    });
  } catch (error) {
    return jsonError(error);
  }
}
