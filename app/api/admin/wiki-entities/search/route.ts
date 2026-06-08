import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { searchWikiEntitiesForLink } from "@/lib/wiki/service";
import { WIKI_ENTITY_TYPES, type WikiEntityType } from "@/db/schema/wiki";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
  types: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const url = new URL(request.url);
    const { q, types } = querySchema.parse(Object.fromEntries(url.searchParams));

    const typeList = (types?.split(",") ?? WIKI_ENTITY_TYPES).filter((t) =>
      WIKI_ENTITY_TYPES.includes(t as WikiEntityType),
    ) as WikiEntityType[];

    const items = await searchWikiEntitiesForLink(ctx.sportId, typeList, q);
    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}
