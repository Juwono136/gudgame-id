import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/admin/session";

export async function GET() {
  try {
    await requireAdminSession();
    const rows = await getDb()
      .select({
        id: sports.id,
        name: sports.name,
        slug: sports.slug,
        isActive: sports.isActive,
        displayOrder: sports.displayOrder,
      })
      .from(sports)
      .where(eq(sports.isActive, true))
      .orderBy(asc(sports.displayOrder));

    return jsonSuccess(rows);
  } catch (error) {
    return jsonError(error);
  }
}
