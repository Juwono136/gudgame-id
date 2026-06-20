import "server-only";

import { AppError } from "@/lib/errors";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import { fetchHtmlForScrape } from "@/lib/wiki/scrapers/fetch-html";
import { extractProductFieldsFromHtml } from "@/lib/wiki/scrapers/extract-product-preview";

export async function scrapePadeltopProduct(
  url: string,
  options?: { sportId?: string | null },
): Promise<WikiScrapePreview> {
  const { html, finalUrl: parsed } = await fetchHtmlForScrape(url, options);
  const fields = extractProductFieldsFromHtml(html, parsed);

  if (!fields.displayName) {
    throw new AppError("Could not detect product name on this page", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  return {
    sourceUrl: parsed.toString(),
    sourceHost: parsed.hostname,
    displayName: fields.displayName,
    summary: fields.summary,
    primaryImageUrl: fields.primaryImageUrl,
    attributes: {
      brand: fields.brand,
      model: fields.displayName,
      priceIdr: fields.priceIdr,
      priceDisplay: fields.priceDisplay,
      price: fields.priceDisplay,
      gearCategory: "racket",
    },
    specs: {},
    performance: {},
    features: [],
  };
}
