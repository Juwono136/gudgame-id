import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { resolveManageParticipantContext } from "@/lib/tournaments/manage-access";
import { assertHostControlsAccess } from "@/lib/tournaments/participant-access";
import { hostMovePlayerToSquad } from "@/lib/tournaments/reclub/teams";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string; teamId: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug, teamId } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const { participant } = await resolveManageParticipantContext(tournament, userId, roles);
    assertHostControlsAccess(participant);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Select a player to move", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await hostMovePlayerToSquad(tournament, userId, parsed.data.userId, teamId);

    return jsonSuccess({ moved: true });
  } catch (error) {
    return jsonError(error);
  }
}
