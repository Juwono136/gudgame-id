import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { lookupWikiEntitiesBySourceUrls } from "@/lib/wiki/source-url-lookup";
import { wikiSourceUrlStatusSchema } from "@/lib/validations/wiki-entities";
import { normalizeWikiSourceUrl } from "@/lib/wiki/normalize-source-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = wikiSourceUrlStatusSchema.parse(await request.json());

    const normalizedUrls = body.urls.map((url) => normalizeWikiSourceUrl(url));

    const rows = await lookupWikiEntitiesBySourceUrls(ctx.sportId, normalizedUrls);

    const byUrl = new Map(rows.map((row) => [normalizeWikiSourceUrl(row.sourceUrl), row]));

    const statuses = normalizedUrls.map((url) => {
      const key = normalizeWikiSourceUrl(url);
      const match = byUrl.get(key);
      return {
        url,
        imported: Boolean(match),
        entityId: match?.entityId ?? null,
        displayName: match?.displayName ?? null,
        status: match?.status ?? null,
        slug: match?.slug ?? null,
      };
    });

    return jsonSuccess({ statuses });
  } catch (error) {
    return jsonError(error);
  }
}
