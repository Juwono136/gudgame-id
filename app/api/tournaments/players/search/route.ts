import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { searchTournamentPlayers } from "@/lib/tournaments/players/search";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  sportSlug: z.string().trim().min(1),
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

export async function GET(request: Request) {
  try {
    await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      sportSlug: url.searchParams.get("sportSlug"),
      q: url.searchParams.get("q"),
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      throw new AppError("Invalid search query", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const [sport] = await getDb()
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, parsed.data.sportSlug))
      .limit(1);

    if (!sport) {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const results = await searchTournamentPlayers(sport.id, parsed.data.q, parsed.data.limit);
    return jsonSuccess({ results });
  } catch (error) {
    return jsonError(error);
  }
}
