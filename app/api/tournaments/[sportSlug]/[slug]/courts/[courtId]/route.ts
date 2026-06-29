import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { renameTournamentCourt } from "@/lib/tournaments/courts/service";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string; courtId: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug, courtId: rawCourtId } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    await assertTournamentManagePageAccess(tournament, userId, roles);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid court name", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const courtId = parseEntityIdParam(rawCourtId, "court id");
    const court = await renameTournamentCourt(tournament.id, courtId, parsed.data.name);
    return jsonSuccess({ court });
  } catch (error) {
    return jsonError(error);
  }
}
