import { getServerSession } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { recordSpecialMatchResult } from "@/lib/tournaments/scoring/match-special-result";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  kind: z.enum(["group", "bracket"]),
  matchId: z.string().uuid(),
  method: z.enum(["walkover", "retirement", "withdrawal"]),
  winnerSide: z.enum(["a", "b"]),
  reason: z.string().trim().min(5).max(240),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const session = await getServerSession();
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    const access = await assertTournamentManagePageAccess(tournament, userId, roles);
    if (!access.canManageScoring) {
      throw new AppError("Scoring access required", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid special-result payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const result = await recordSpecialMatchResult(
      tournament,
      userId,
      session?.user?.name ?? null,
      parsed.data,
    );
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
