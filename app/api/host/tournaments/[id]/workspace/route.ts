import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { getHostTournamentWorkspace } from "@/lib/tournaments/workspace/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const { id } = await params;
    const tournamentId = parseEntityIdParam(id, "tournament id");

    const workspace = await getHostTournamentWorkspace(tournamentId, userId, roles);
    return jsonSuccess({ workspace });
  } catch (error) {
    return jsonError(error);
  }
}
