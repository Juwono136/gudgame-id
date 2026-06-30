import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { requireDashboardSportContext } from "@/lib/dashboard/sport-context";
import { listCreatorTournamentHistory } from "@/lib/tournaments/archives/service";
import { tournamentsListQuerySchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const sportCtx = await requireDashboardSportContext(userId);
    const url = new URL(request.url);
    const query = tournamentsListQuerySchema.parse(Object.fromEntries(url.searchParams));

    const result = await listCreatorTournamentHistory(userId, query, sportCtx.sportId);
    return jsonSuccess({ ...result, sportSlug: sportCtx.sportSlug });
  } catch (error) {
    return jsonError(error);
  }
}
