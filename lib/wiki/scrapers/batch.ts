import "server-only";

import { AppError } from "@/lib/errors";
import { scrapeGearFromUrl } from "@/lib/wiki/scrapers";
import type { WikiBatchScrapeResult } from "@/lib/wiki/scrapers/types";

export const MAX_BATCH_URLS = 30;
const BATCH_CONCURRENCY = 3;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function batchScrapeGearProducts(
  urls: string[],
  sportSlug: string,
  options?: { sportId?: string | null },
): Promise<WikiBatchScrapeResult> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];

  if (unique.length === 0) {
    throw new AppError("Select at least one product URL", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (unique.length > MAX_BATCH_URLS) {
    throw new AppError(`You can import up to ${MAX_BATCH_URLS} products at once`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const outcomes = await mapPool(unique, BATCH_CONCURRENCY, async (url) => {
    try {
      const preview = await scrapeGearFromUrl(url, sportSlug, options);
      return { ok: true as const, preview };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scrape failed";
      return { ok: false as const, url, error: message };
    }
  });

  const succeeded: WikiBatchScrapeResult["succeeded"] = [];
  const failed: WikiBatchScrapeResult["failed"] = [];

  for (const o of outcomes) {
    if (o.ok) succeeded.push(o.preview);
    else failed.push({ url: o.url, error: o.error });
  }

  return { succeeded, failed };
}
