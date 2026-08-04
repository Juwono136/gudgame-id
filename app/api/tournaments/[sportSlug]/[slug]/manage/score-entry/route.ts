import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { patchTournamentScoreEntryMode } from "@/lib/tournaments/score-entry-service";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  scoreEntryMode: z.enum(["live", "paper"]),
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

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid score entry mode", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const scoreEntryMode = await patchTournamentScoreEntryMode(
      tournament,
      userId,
      roles,
      parsed.data.scoreEntryMode,
    );

    return jsonSuccess({ scoreEntryMode });
  } catch (error) {
    return jsonError(error);
  }
}
