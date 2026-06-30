import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import {
  bulkDeleteDirectoryByFilter,
  bulkDeleteDirectoryItems,
} from "@/lib/wiki/directory-bulk-delete";
import { wikiBulkDeleteSchema } from "@/lib/validations/wiki-entities";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = wikiBulkDeleteSchema.parse(await request.json());

    if (body.mode === "filter" && body.filter) {
      const result = await bulkDeleteDirectoryByFilter({
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

    const result = await bulkDeleteDirectoryItems({
      sportId: ctx.sportId,
      actorId: ctx.userId,
      wikiEntityIds: body.wikiEntityIds,
      tournamentIds: body.tournamentIds,
    });

    return jsonSuccess({ ...result, matched: body.wikiEntityIds.length + body.tournamentIds.length });
  } catch (error) {
    return jsonError(error);
  }
}
