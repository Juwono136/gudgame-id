import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { assertCanCreateTournamentType } from "@/lib/tournaments/permissions";
import { createTournament } from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = tournamentUpsertSchema.extend({
  sportSlug: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    assertCanCreateTournamentType(roles, parsed.data.tournamentType);

    const [sport] = await getDb()
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, parsed.data.sportSlug))
      .limit(1);

    if (!sport) {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const { sportSlug: _slug, ...input } = parsed.data;
    const tournament = await createTournament(sport.id, userId, input);
    return jsonSuccess({ tournament }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
