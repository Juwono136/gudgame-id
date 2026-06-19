import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { updateReclubLiveScore } from "@/lib/tournaments/reclub/live-score";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.coerce.number().int().min(0).max(99),
  scoreB: z.coerce.number().int().min(0).max(99),
  action: z.enum(["set", "increment", "decrement"]).optional(),
  side: z.enum(["a", "b"]).optional(),
});

export async function PATCH(
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
      throw new AppError("Only the host can update live scores", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid score payload", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const session = await getServerSession();
    const match = await updateReclubLiveScore(
      tournament,
      parsed.data.matchId,
      userId,
      session?.user?.name ?? null,
      {
        scoreA: parsed.data.scoreA,
        scoreB: parsed.data.scoreB,
        action: parsed.data.action,
        side: parsed.data.side,
      },
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
