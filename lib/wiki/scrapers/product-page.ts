import "server-only";

import { AppError } from "@/lib/errors";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import { fetchHtmlForScrape } from "@/lib/wiki/scrapers/fetch-html";
import {
  decodeHtmlEntities,
  extractJsonLdProduct,
  extractMetaContent,
  stripHtmlTags,
} from "@/lib/wiki/scrapers/parse-html";

/** Generic product page scrape via Open Graph + JSON-LD (works on many stores). */
export async function scrapeGenericProductPage(url: string): Promise<WikiScrapePreview> {
  const { html, finalUrl: parsed } = await fetchHtmlForScrape(url);

  const product = extractJsonLdProduct(html);
  const ogTitle = extractMetaContent(html, "og:title");
  const ogImage = extractMetaContent(html, "og:image");
  const ogDesc = extractMetaContent(html, "og:description");

  let displayName = ogTitle ?? "";
  if (product?.name && typeof product.name === "string") {
    displayName = product.name;
  }
  displayName = decodeHtmlEntities(displayName)
    .replace(/\s*\(RACKET\)\s*/gi, "")
    .replace(/\s*\/\s*$/g, "")
    .trim();

  if (!displayName) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    displayName = titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1].trim()) : "";
  }

  if (!displayName) {
    throw new AppError("Could not detect product name on this page", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  let price: string | undefined;
  if (product?.offers) {
    const offers = product.offers as Record<string, unknown> | Record<string, unknown>[];
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (offer && typeof offer === "object" && "price" in offer) {
      const p = offer.price;
      const currency = (offer.priceCurrency as string) ?? "IDR";
      price = `${currency} ${p}`;
    }
  }
  if (!price) {
    const priceMatch = html.match(/Rp\s?[\d.,]+|€\s?[\d.,]+|\$\s?[\d.,]+/i);
    if (priceMatch) price = priceMatch[0];
  }

  const brandMatch = displayName.match(
    /^(ADIDAS|BABOLAT|BULLPADEL|HEAD|NOX|SIUX|WILSON|BLACK CROWN|HIROSTAR|DECATHLON)/i,
  );

  let summary = ogDesc ? stripHtmlTags(ogDesc) : "";
  if (product?.description && typeof product.description === "string") {
    summary = stripHtmlTags(product.description).slice(0, 800);
  }

  const imageUrl =
    ogImage ?? (typeof product?.image === "string" ? product.image : undefined);

  return {
    sourceUrl: parsed.toString(),
    sourceHost: parsed.hostname,
    displayName,
    summary: summary || undefined,
    primaryImageUrl: imageUrl,
    attributes: {
      brand: brandMatch?.[1]?.toUpperCase() ?? "",
      model: displayName,
      price: price ?? "",
      gearCategory: "racket",
    },
    specs: {},
    performance: {},
    features: [],
  };
}
