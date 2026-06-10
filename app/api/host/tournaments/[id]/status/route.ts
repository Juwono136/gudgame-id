import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { TOURNAMENT_STATUSES } from "@/db/schema/tournaments";
import { updateTournamentStatus } from "@/lib/tournaments/workspace/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(TOURNAMENT_STATUSES),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const { id } = await params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new AppError("Invalid tournament id", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Invalid status", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const tournament = await updateTournamentStatus(
      tournamentId,
      userId,
      roles,
      parsed.data.status,
    );
    return jsonSuccess({ tournament });
  } catch (error) {
    return jsonError(error);
  }
}
