import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertCanManageScoring } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { completeReclubRound } from "@/lib/tournaments/reclub/matches";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.coerce.number().int().min(0).max(999),
  scoreB: z.coerce.number().int().min(0).max(999),
  durationSeconds: z.coerce.number().int().min(0).max(86400),
  summary: z.string().trim().max(500).optional(),
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

    await assertCanManageScoring(tournament, userId, roles);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Invalid match result", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const match = await completeReclubRound(tournament, parsed.data.matchId, userId, {
      scoreA: parsed.data.scoreA,
      scoreB: parsed.data.scoreB,
      durationSeconds: parsed.data.durationSeconds,
      summary: parsed.data.summary,
    });
    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
