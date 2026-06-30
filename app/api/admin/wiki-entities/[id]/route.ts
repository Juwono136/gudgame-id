import { NextResponse } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import {
  deleteWikiEntity,
  getWikiEntityById,
  updateWikiEntity,
} from "@/lib/wiki/service";
import {
  assertAdminCanManageWikiEntity,
  getWikiEntityAdminAccessRow,
} from "@/lib/wiki/admin-entity-access";
import { parseAndUploadWikiForm } from "@/lib/wiki/parse-wiki-form";
import { assertAdminFormSportScope } from "@/lib/wiki/assert-sport-scope";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const ctx = await requireWikiManagementAccess();
    const { id } = await context.params;
    const entityId = parseEntityIdParam(id, "entity id");
    const access = await getWikiEntityAdminAccessRow(entityId);
    if (!access) {
      throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    assertAdminCanManageWikiEntity(access, ctx.userId, ctx.sportId);

    const entity = await getWikiEntityById(entityId);
    if (!entity || entity.sportId !== ctx.sportId) {
      throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    return jsonSuccess(entity);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ctx = await requireWikiManagementAccess();
    const { id } = await context.params;
    const entityId = parseEntityIdParam(id, "entity id");

    const formData = await request.formData();
    assertAdminFormSportScope(formData, ctx.sportSlug);
    const parsed = await parseAndUploadWikiForm(formData, ctx.sportSlug);

    if (!parsed.ok) {
      return NextResponse.json(parsed.body, { status: parsed.status });
    }

    const { data, imagePatch } = parsed.result;
    const updated = await updateWikiEntity(
      entityId,
      ctx.sportId,
      data,
      ctx.userId,
      imagePatch,
    );
    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const ctx = await requireWikiManagementAccess();
    const { id } = await context.params;
    const entityId = parseEntityIdParam(id, "entity id");
    await deleteWikiEntity(entityId, ctx.sportId, ctx.userId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
