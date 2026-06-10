import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { generateTournamentBracket } from "@/lib/tournaments/brackets/generate";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (tournament.tournamentType !== "recreational") {
      throw new AppError("Use the host dashboard to generate official brackets", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Only the host can generate the bracket", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    if (tournament.status === "completed" || tournament.status === "cancelled") {
      throw new AppError("Cannot generate bracket for a finished session", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const result = await generateTournamentBracket(tournament);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
