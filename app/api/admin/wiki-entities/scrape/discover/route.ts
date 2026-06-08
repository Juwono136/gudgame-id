import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { discoverGearCatalog } from "@/lib/wiki/scrapers";
import { wikiScrapeRequestSchema } from "@/lib/validations/wiki-entities";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = wikiScrapeRequestSchema.parse(await request.json());

    if (body.sportSlug !== ctx.sportSlug) {
      throw new AppError(
        `Discovery is scoped to active sport (${ctx.sportSlug}).`,
        { code: "VALIDATION_ERROR", statusCode: 400 },
      );
    }

    const discovery = await discoverGearCatalog(body.url, ctx.sportSlug);
    return jsonSuccess(discovery);
  } catch (error) {
    return jsonError(error);
  }
}
