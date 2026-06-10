import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { startReclubRound } from "@/lib/tournaments/reclub/matches";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamAId: z.coerce.number().int().positive(),
  teamBId: z.coerce.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Only the host can start a round", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Select two teams to start", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    if (parsed.data.teamAId === parsed.data.teamBId) {
      throw new AppError("Teams must be different", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const match = await startReclubRound(
      tournament,
      userId,
      parsed.data.teamAId,
      parsed.data.teamBId,
    );
    return jsonSuccess({ match }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
