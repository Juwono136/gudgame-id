import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assignTeamToBracketSlot } from "@/lib/tournaments/brackets/assign";
import { assertCanManageBracket } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  matchId: z.string().uuid(),
  slot: z.enum(["a", "b"]),
  teamId: z.string().uuid().nullable().optional(),
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

    await assertCanManageBracket(tournament, userId, roles);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid assignment payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const match = await assignTeamToBracketSlot(
      tournament,
      parsed.data.matchId,
      parsed.data.slot,
      parsed.data.teamId ?? null,
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
