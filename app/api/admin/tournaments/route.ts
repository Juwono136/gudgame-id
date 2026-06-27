import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { createTournament, listTournaments } from "@/lib/tournaments/service";
import { assertCanCreateTournamentType } from "@/lib/tournaments/permissions";
import { AppError } from "@/lib/errors";
import {
  tournamentUpsertSchema,
  tournamentsListQuerySchema,
} from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const url = new URL(request.url);
    const query = tournamentsListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const list = await listTournaments(ctx.sportId, query);
    return jsonSuccess({ ...list, sportSlug: ctx.sportSlug });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
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
      ctx.roles,
      parsed.data.tournamentType,
      parsed.data.officialBilling,
    );

    const tournament = await createTournament(ctx.sportId, ctx.userId, parsed.data);
    return jsonSuccess({ tournament }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
