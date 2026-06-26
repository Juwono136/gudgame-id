import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { scrapeGearFromUrl } from "@/lib/wiki/scrapers";
import { wikiScrapeRequestSchema } from "@/lib/validations/wiki-entities";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = wikiScrapeRequestSchema.parse(await request.json());

    if (body.sportSlug !== ctx.sportSlug) {
      throw new AppError(
        `Scraping is scoped to the active sport (${ctx.sportSlug}). Switch sport context first.`,
        { code: "VALIDATION_ERROR", statusCode: 400 },
      );
    }

    const preview = await scrapeGearFromUrl(body.url, ctx.sportSlug, {
      sportId: ctx.sportId,
    });
    return jsonSuccess(preview);
  } catch (error) {
    return jsonError(error);
  }
}
