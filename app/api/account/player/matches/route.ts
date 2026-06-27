import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  getPlayerMatchListSummary,
  listDistinctMatchYears,
  listPlayerMatches,
} from "@/lib/account/player-competition/list-matches";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { playerMatchesListQuerySchema } from "@/lib/validations/player-competition";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requirePlayerDashboardAccess();
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

    const list = await listPlayerMatches(userId, parsed.data);
    const years = url.searchParams.get("includeYears") === "1"
      ? await listDistinctMatchYears(userId)
      : undefined;
    const summary = url.searchParams.get("includeSummary") === "1"
      ? await getPlayerMatchListSummary(userId, {
          search: parsed.data.search,
          result: parsed.data.result,
          type: parsed.data.type,
          year: parsed.data.year,
        })
      : undefined;

    return jsonSuccess({ ...list, years, summary });
  } catch (error) {
    return jsonError(error);
  }
}
