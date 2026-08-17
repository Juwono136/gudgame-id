import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { requireDashboardSportContext } from "@/lib/dashboard/sport-context";
import {
  getCreatorTournamentCounts,
  listCreatorTournamentHistory,
  type CreatorTournamentScope,
} from "@/lib/tournaments/archives/service";
import { tournamentsListQuerySchema } from "@/lib/validations/tournaments";
import { z } from "zod";

export const runtime = "nodejs";

const scopeSchema = z.enum(["active", "history", "all"]).default("all");

export async function GET(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const sportCtx = await requireDashboardSportContext(userId);
    const url = new URL(request.url);
    const query = tournamentsListQuerySchema.parse(Object.fromEntries(url.searchParams));
    const scope = scopeSchema.parse(url.searchParams.get("scope") ?? "all") as CreatorTournamentScope;

    const [result, counts] = await Promise.all([
      listCreatorTournamentHistory(userId, query, sportCtx.sportId, scope),
      getCreatorTournamentCounts(userId, sportCtx.sportId),
    ]);

    return jsonSuccess({
      ...result,
      counts,
      sportSlug: sportCtx.sportSlug,
      scope,
    });
  } catch (error) {
    return jsonError(error);
  }
}
