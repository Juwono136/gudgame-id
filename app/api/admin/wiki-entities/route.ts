import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { getWikiDirectoryStats, listWikiDirectory } from "@/lib/wiki/directory";
import { createWikiEntity } from "@/lib/wiki/service";
import { parseAndUploadWikiForm } from "@/lib/wiki/parse-wiki-form";
import { assertAdminFormSportScope } from "@/lib/wiki/assert-sport-scope";
import {
  wikiEntitiesListQuerySchema,
} from "@/lib/validations/wiki-entities";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const url = new URL(request.url);
    const query = wikiEntitiesListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const directoryOptions = { tournamentCreatedBy: ctx.userId, adminUserId: ctx.userId };
    const [list, stats] = await Promise.all([
      listWikiDirectory(ctx.sportId, query, directoryOptions),
      getWikiDirectoryStats(ctx.sportId, directoryOptions),
    ]);
    return jsonSuccess({
      ...list,
      stats,
      sportSlug: ctx.sportSlug,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const formData = await request.formData();
    assertAdminFormSportScope(formData, ctx.sportSlug);
    const parsed = await parseAndUploadWikiForm(formData, ctx.sportSlug);

    if (!parsed.ok) {
      return NextResponse.json(parsed.body, { status: parsed.status });
    }

    const { data, imagePatch } = parsed.result;
    const created = await createWikiEntity(
      ctx.sportId,
      data,
      ctx.userId,
      imagePatch,
    );
    return jsonSuccess(created, 201);
  } catch (error) {
    return jsonError(error);
  }
}
