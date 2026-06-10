import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { updateBracketLiveScore } from "@/lib/tournaments/brackets/service";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  scoreA: z.coerce.number().int().min(0).max(99),
  scoreB: z.coerce.number().int().min(0).max(99),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string; matchId: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug, matchId } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Only the host can update live scores", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid scores", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const match = await updateBracketLiveScore(
      tournament,
      Number(matchId),
      parsed.data.scoreA,
      parsed.data.scoreB,
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
