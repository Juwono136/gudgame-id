import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import { batchScrapeGearProducts } from "@/lib/wiki/scrapers";
import { normalizeScrapeInputUrl } from "@/lib/wiki/scrapers/normalize-url";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  urls: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .transform(normalizeScrapeInputUrl)
        .pipe(z.string().url()),
    )
    .min(1)
    .max(30),
  sportSlug: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = bodySchema.parse(await request.json());

    if (body.sportSlug !== ctx.sportSlug) {
      throw new AppError("Sport context mismatch", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const result = await batchScrapeGearProducts(body.urls, ctx.sportSlug, {
      sportId: ctx.sportId,
    });
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
