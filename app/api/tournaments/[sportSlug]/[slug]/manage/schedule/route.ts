import { getServerSession } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { updateTournamentMatchSchedule } from "@/lib/tournaments/double-stage/schedule";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  kind: z.enum(["group", "bracket"]),
  matchId: z.string().uuid(),
  scheduledAt: z.string().datetime().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    await getServerSession();
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    await assertTournamentManagePageAccess(tournament, userId, roles);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Invalid schedule payload", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const result = await updateTournamentMatchSchedule(tournament, parsed.data);
    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e);
  }
}
