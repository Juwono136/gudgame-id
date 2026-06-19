import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getPlayerMatchDetail } from "@/lib/account/player-competition/get-match-detail";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId } = await requirePlayerDashboardAccess();
    const { id } = await context.params;
    const matchId = Number(id);

    if (!Number.isInteger(matchId) || matchId < 1) {
      throw new AppError("Invalid match id", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const match = await getPlayerMatchDetail(userId, matchId);
    if (!match) {
      throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
