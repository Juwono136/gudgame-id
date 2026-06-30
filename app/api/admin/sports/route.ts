import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/admin/session";
import { hasPermission } from "@/lib/roles/permissions";
import { parseSportAdminForm } from "@/lib/sports/parse-sport-form";
import { createSport, listAdminSportsPaginated, listProvisionedSportSlugs } from "@/lib/sports/service";
import { AppError } from "@/lib/errors";
import { sportsListQuerySchema } from "@/lib/validations/sports-admin";

export const runtime = "nodejs";

/** Active sports for admin sport selector (all wiki admins). */
async function listSelectorSports() {
  return getDb()
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
}

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminSession();
    const url = new URL(request.url);
    const view = url.searchParams.get("view");

    if (view === "provisioned-slugs") {
      const slugs = await listProvisionedSportSlugs();
      return jsonSuccess({ slugs });
    }

    if (view === "manage") {
      if (!hasPermission(ctx.roles, "admin.sports.manage")) {
        throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
      }
      const query = sportsListQuerySchema.parse(
        Object.fromEntries(url.searchParams.entries()),
      );
      const list = await listAdminSportsPaginated(query);
      return jsonSuccess(list);
    }

    const rows = await listSelectorSports();
    return jsonSuccess(rows);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdminSession();
    if (!hasPermission(ctx.roles, "admin.sports.manage")) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const formData = await request.formData();
    const parsed = await parseSportAdminForm(formData);
    const sport = await createSport(parsed.input, {
      heroImageUrl: parsed.heroImageUrl,
      heroImageStorageKey: parsed.heroImageStorageKey,
    });
    return jsonSuccess({ sport }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
