import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/admin/session";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { hasPermission } from "@/lib/roles/permissions";
import { parseSportAdminForm } from "@/lib/sports/parse-sport-form";
import { deleteSport, getAdminSportById, updateSport } from "@/lib/sports/service";
import { AppError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const ctx = await requireAdminSession();
    if (!hasPermission(ctx.roles, "admin.sports.manage")) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const { id } = await context.params;
    const sportId = parseEntityIdParam(id, "sport id");

    const sport = await getAdminSportById(sportId);
    if (!sport) {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    return jsonSuccess({ sport });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ctx = await requireAdminSession();
    if (!hasPermission(ctx.roles, "admin.sports.manage")) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const { id } = await context.params;
    const sportId = parseEntityIdParam(id, "sport id");

    const existing = await getAdminSportById(sportId);
    if (!existing) {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const formData = await request.formData();
    const parsed = await parseSportAdminForm(formData, {
      existingSlug: existing.slug,
      existingHeroStorageKey: existing.heroImageStorageKey,
      existingHeroImageUrl: existing.heroImageUrl,
    });

    const sport = await updateSport(sportId, parsed.input, {
      heroImageUrl: parsed.heroImageUrl,
      heroImageStorageKey: parsed.heroImageStorageKey,
    });
    return jsonSuccess({ sport });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const ctx = await requireAdminSession();
    if (!hasPermission(ctx.roles, "admin.sports.manage")) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const { id } = await context.params;
    const sportId = parseEntityIdParam(id, "sport id");

    await deleteSport(sportId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
