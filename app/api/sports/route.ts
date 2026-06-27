import { jsonError, jsonSuccess } from "@/lib/api/response";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await getDb()
      .select({
        id: sports.id,
        name: sports.name,
        slug: sports.slug,
        visibility: sports.visibility,
        tagline: sports.tagline,
      })
      .from(sports)
      .where(eq(sports.isActive, true))
      .orderBy(sports.displayOrder);

    return jsonSuccess({
      items: rows.filter((s) => s.visibility === "live" || s.visibility === "coming_soon"),
    });
  } catch (error) {
    return jsonError(error);
  }
}
