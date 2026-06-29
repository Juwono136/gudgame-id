import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { patchTournamentDisplayConfig } from "@/lib/tournaments/display-config-service";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  layout: z.enum(["single", "multi_court", "bracket", "leaderboard", "rotation"]),
  autoRotate: z.boolean().optional(),
  rotationIntervalSec: z.number().int().min(5).max(120).optional(),
  rotationLayouts: z
    .array(z.enum(["single", "multi_court", "bracket", "leaderboard", "rotation"]))
    .optional(),
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
      throw new AppError("Invalid display configuration", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const displayConfig = await patchTournamentDisplayConfig(
      tournament,
      userId,
      roles,
      parsed.data,
    );

    return jsonSuccess({ displayConfig });
  } catch (error) {
    return jsonError(error);
  }
}
