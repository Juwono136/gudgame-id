import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  listDistinctTournamentYears,
  listPlayerTournaments,
} from "@/lib/account/player-competition/list-tournaments";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { playerTournamentsListQuerySchema } from "@/lib/validations/player-competition";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requirePlayerDashboardAccess();
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

    const list = await listPlayerTournaments(userId, parsed.data);
    const years = url.searchParams.get("includeYears") === "1"
      ? await listDistinctTournamentYears(userId)
      : undefined;

    return jsonSuccess({ ...list, years });
  } catch (error) {
    return jsonError(error);
  }
}
