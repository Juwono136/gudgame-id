import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { createNamedTeam } from "@/lib/tournaments/reclub/teams";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamName: z.string().trim().min(2).max(120),
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
      throw new AppError("Named teams are only for reclub tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid team name", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const result = await createNamedTeam(tournament, userId, parsed.data.teamName);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
