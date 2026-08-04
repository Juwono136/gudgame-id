import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { startBracketMatchOnCourt } from "@/lib/tournaments/brackets/start-match";
import { assertCanManageScoring } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  matchId: z.string().uuid(),
  courtId: z.string().uuid(),
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

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid start match payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const match = await startBracketMatchOnCourt(
      tournament,
      parsed.data.matchId,
      parsed.data.courtId,
      userId,
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
