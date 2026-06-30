import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import {
  bulkPublishDirectoryByFilter,
  bulkPublishWikiEntities,
} from "@/lib/wiki/directory-bulk-publish";
import { wikiBulkPublishSchema } from "@/lib/validations/wiki-entities";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = wikiBulkPublishSchema.parse(await request.json());

    if (body.mode === "filter" && body.filter) {
      const result = await bulkPublishDirectoryByFilter({
        sportId: ctx.sportId,
        actorId: ctx.userId,
        filter: body.filter,
        options: {
          adminUserId: ctx.userId,
          tournamentCreatedBy: ctx.userId,
        },
      });
      return jsonSuccess(result);
    }

    const result = await bulkPublishWikiEntities({
      sportId: ctx.sportId,
      actorId: ctx.userId,
      wikiEntityIds: body.wikiEntityIds,
    });

    return jsonSuccess({ ...result, matched: body.wikiEntityIds.length });
  } catch (error) {
    return jsonError(error);
  }
}
