import { eq } from "drizzle-orm";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema";
import { searchPublishedGearForTournament } from "@/lib/wiki/service";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
  sportSlug: z.string().trim().min(1).max(50),
});

export async function GET(request: Request) {
  try {
    await requireApiRoleGuardContext();
    const url = new URL(request.url);
    const { q, sportSlug } = querySchema.parse(Object.fromEntries(url.searchParams));

    const [sport] = await getDb()
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, sportSlug))
      .limit(1);

    if (!sport) {
      return jsonSuccess({ items: [] });
    }

    const items = await searchPublishedGearForTournament(sport.id, q);
    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}
