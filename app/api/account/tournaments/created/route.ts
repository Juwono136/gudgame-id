import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { listCreatorTournamentHistory } from "@/lib/tournaments/archives/service";
import { tournamentsListQuerySchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const query = tournamentsListQuerySchema.parse(Object.fromEntries(url.searchParams));

    const result = await listCreatorTournamentHistory(userId, query);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
