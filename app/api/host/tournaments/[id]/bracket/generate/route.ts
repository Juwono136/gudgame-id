import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { isFunMatchType, isOfficialType } from "@/lib/tournaments/core/types";
import { generateTournamentBracket } from "@/lib/tournaments/brackets/generate";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const { id } = await params;
    const tournamentId = parseEntityIdParam(id, "tournament id");

    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    if (!isOfficialType(tournament.tournamentType) && !isFunMatchType(tournament.tournamentType)) {
      throw new AppError("Brackets are only for official or Fun Match tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    const result = await generateTournamentBracket(tournament);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
