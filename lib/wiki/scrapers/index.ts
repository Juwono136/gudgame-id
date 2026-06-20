import "server-only";

import { AppError } from "@/lib/errors";
import { scrapePadeltopProduct } from "@/lib/wiki/scrapers/padeltop";
import { scrapeGenericProductPage } from "@/lib/wiki/scrapers/product-page";
import { discoverGearCatalog } from "@/lib/wiki/scrapers/discover";
import { batchScrapeGearProducts } from "@/lib/wiki/scrapers/batch";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import { assertScrapeUrlAllowed } from "@/lib/wiki/scrapers/security";

export type {
  WikiScrapePreview,
  WikiCatalogDiscovery,
  WikiCatalogListItem,
  WikiBatchScrapeResult,
} from "@/lib/wiki/scrapers/types";

export { discoverGearCatalog, batchScrapeGearProducts };

export async function scrapeGearFromUrl(
  url: string,
  sportSlug: string,
  options?: { sportId?: string | null },
): Promise<WikiScrapePreview> {
  const parsed = await assertScrapeUrlAllowed(url, options);
  const host = parsed.hostname.toLowerCase();

  if (host === "padeltop.id" || host === "www.padeltop.id") {
    return scrapePadeltopProduct(url, options);
  }

  return scrapeGenericProductPage(url, options);
}
