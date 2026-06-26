import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { z } from "zod";
import { discoverGearCatalog } from "@/lib/wiki/scrapers";
import { wikiScrapeRequestSchema } from "@/lib/validations/wiki-entities";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const parsed = wikiScrapeRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid scrape URL", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }
    const body = parsed.data;

    if (body.sportSlug !== ctx.sportSlug) {
      throw new AppError(
        `Discovery is scoped to active sport (${ctx.sportSlug}).`,
        { code: "VALIDATION_ERROR", statusCode: 400 },
      );
    }

    const discovery = await discoverGearCatalog(body.url, ctx.sportSlug, {
      sportId: ctx.sportId,
    });
    return jsonSuccess(discovery);
  } catch (error) {
    return jsonError(error);
  }
}
