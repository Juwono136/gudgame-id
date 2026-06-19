import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { renameReclubTeam } from "@/lib/tournaments/reclub/teams";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string; teamId: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { sportSlug, slug, teamId } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid team name", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    await renameReclubTeam(tournament, userId, parseEntityIdParam(teamId, "team id"), parsed.data.name);
    return jsonSuccess({ renamed: true });
  } catch (error) {
    return jsonError(error);
  }
}
