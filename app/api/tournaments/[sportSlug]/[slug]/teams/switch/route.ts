import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { switchTeam } from "@/lib/tournaments/reclub/teams";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (tournament.tournamentType !== "recreational") {
      throw new AppError("Team switching is only for Fun Match tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Invalid team", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await switchTeam(tournament, userId, parsed.data.teamId);
    return jsonSuccess({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
