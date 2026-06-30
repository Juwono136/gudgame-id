import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { requireDashboardSportContext } from "@/lib/dashboard/sport-context";
import { AppError } from "@/lib/errors";
import { assertCanCreateTournamentType } from "@/lib/tournaments/permissions";
import { createTournament } from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await requireHostDashboardAccess();
    const sportCtx = await requireDashboardSportContext(userId);
    const { listHostTournaments } = await import("@/lib/tournaments/workspace/service");
    const items = await listHostTournaments(userId, sportCtx.sportId);
    return jsonSuccess({ items, sportSlug: sportCtx.sportSlug });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const sportCtx = await requireDashboardSportContext(userId);
    const body = await request.json();
    const parsed = tournamentUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    assertCanCreateTournamentType(
      roles,
      parsed.data.tournamentType,
      parsed.data.officialBilling,
    );
    const tournament = await createTournament(sportCtx.sportId, userId, parsed.data);
    return jsonSuccess({ tournament, sportSlug: sportCtx.sportSlug }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
