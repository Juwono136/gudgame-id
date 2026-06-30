import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  getPlayerMatchListSummary,
  listDistinctMatchYears,
  listPlayerMatches,
} from "@/lib/account/player-competition/list-matches";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { requireDashboardSportContext } from "@/lib/dashboard/sport-context";
import { AppError } from "@/lib/errors";
import { playerMatchesListQuerySchema } from "@/lib/validations/player-competition";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requirePlayerDashboardAccess();
    const sportCtx = await requireDashboardSportContext(userId);
    const url = new URL(request.url);
    const parsed = playerMatchesListQuerySchema.safeParse(
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
    const list = await listPlayerMatches(userId, query);
    const years = url.searchParams.get("includeYears") === "1"
      ? await listDistinctMatchYears(userId, sportCtx.sportSlug)
      : undefined;
    const summary = url.searchParams.get("includeSummary") === "1"
      ? await getPlayerMatchListSummary(userId, {
          search: query.search,
          result: query.result,
          type: query.type,
          year: query.year,
          sportSlug: sportCtx.sportSlug,
        })
      : undefined;

    return jsonSuccess({ ...list, years, summary, sportSlug: sportCtx.sportSlug });
  } catch (error) {
    return jsonError(error);
  }
}
