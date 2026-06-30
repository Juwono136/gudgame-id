import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  listDistinctTournamentYears,
  listPlayerTournaments,
} from "@/lib/account/player-competition/list-tournaments";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { requireDashboardSportContext } from "@/lib/dashboard/sport-context";
import { AppError } from "@/lib/errors";
import { playerTournamentsListQuerySchema } from "@/lib/validations/player-competition";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId, roles } = await requireRoleGuardContext();
    const sportCtx = await requireDashboardSportContext(userId);
    const url = new URL(request.url);
    const parsed = playerTournamentsListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      throw new AppError("Invalid query parameters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const query = { ...parsed.data, sportSlug: sportCtx.sportSlug };
    const list = await listPlayerTournaments(userId, roles, query);
    const years = url.searchParams.get("includeYears") === "1"
      ? await listDistinctTournamentYears(userId, roles, sportCtx.sportSlug)
      : undefined;

    return jsonSuccess({ ...list, years, sportSlug: sportCtx.sportSlug });
  } catch (error) {
    return jsonError(error);
  }
}
