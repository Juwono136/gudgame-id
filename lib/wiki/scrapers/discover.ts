import "server-only";

import { AppError } from "@/lib/errors";
import { decodeHtmlEntities } from "@/lib/wiki/scrapers/parse-html";
import { fetchHtmlForScrape } from "@/lib/wiki/scrapers/fetch-html";
import type { WikiCatalogDiscovery, WikiCatalogListItem } from "@/lib/wiki/scrapers/types";
import { assertScrapeUrlAllowed } from "@/lib/wiki/scrapers/security";
import { discoverByHost } from "@/lib/wiki/scrapers/discover-sites";

export const MAX_CATALOG_ITEMS = 80;

function resolveUrl(href: string, base: URL): string | null {
  try {
    if (href.startsWith("//")) return `https:${href}`;
    if (href.startsWith("/")) return `${base.origin}${href}`;
    if (href.startsWith("http")) return href;
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Extract product links from PadelTop / Shopify-style HTML */
export function discoverPadeltopProducts(html: string, baseUrl: URL): WikiCatalogListItem[] {
  const seen = new Set<string>();
  const items: WikiCatalogListItem[] = [];

  const patterns = [
    /<a[^>]+href=["']([^"']*\/products\/[^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /href=["']([^"']*\/products\/[^"'?#]+)["']/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const href = m[1]!;
      const full = resolveUrl(href, baseUrl);
      if (!full || !full.includes("/products/") || seen.has(full)) continue;
      seen.add(full);

      let title = "";
      if (m[2]) {
        const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        title = decodeHtmlEntities(inner).slice(0, 200);
      }
      if (!title) {
        const slug = full.split("/products/")[1]?.split("?")[0]?.replace(/-/g, " ");
        title = slug ? decodeHtmlEntities(slug) : "Product";
      }

      const imgMatch = m[0]?.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
      const priceMatch = m[0]?.match(/Rp\s?[\d.,]+/i);

      items.push({
        url: full.split("?")[0]!,
        title: title.replace(/\s*\(RACKET\)\s*/gi, "").trim(),
        imageUrl: imgMatch?.[1] ? resolveUrl(imgMatch[1], baseUrl) ?? undefined : undefined,
        priceHint: priceMatch?.[0],
      });
    }
  }

  return items;
}

function isLikelyProductPage(url: URL): boolean {
  const p = url.pathname.toLowerCase();
  return (
    /\/products\/[^/]+$/i.test(p) ||
    /\/p\/[^/]+/i.test(p) ||
    /\/rackets\/[^/]+/i.test(p) ||
    /\/en\/[^/]+\/[^/]+$/i.test(p)
  );
}

export async function discoverGearCatalog(
  url: string,
  sportSlug: string,
): Promise<WikiCatalogDiscovery> {
  const parsed = assertScrapeUrlAllowed(url);
  void sportSlug;

  const { html, finalUrl } = await fetchHtmlForScrape(url);
  const host = finalUrl.hostname.toLowerCase();

  if (isLikelyProductPage(finalUrl)) {
    const slug = finalUrl.pathname.split("/products/")[1] ?? "product";
    return {
      sourceUrl: finalUrl.toString(),
      sourceHost: finalUrl.hostname,
      pageType: "product",
      items: [
        {
          url: finalUrl.toString().split("?")[0]!,
          title: slug.replace(/-/g, " "),
        },
      ],
      truncated: false,
      totalFound: 1,
    };
  }

  const all =
    host.includes("padeltop")
      ? discoverPadeltopProducts(html, finalUrl)
      : discoverByHost(host, html, finalUrl);
  const unique = dedupeByUrl(all);
  const truncated = unique.length > MAX_CATALOG_ITEMS;
  const items = unique.slice(0, MAX_CATALOG_ITEMS);

  if (items.length === 0) {
    throw new AppError(
      "No product links found on this page. Try a category or collection URL (e.g. /collections/rackets).",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }

  return {
    sourceUrl: finalUrl.toString(),
    sourceHost: finalUrl.hostname,
    pageType: "catalog",
    items,
    truncated,
    totalFound: unique.length,
  };
}

function dedupeByUrl(items: WikiCatalogListItem[]): WikiCatalogListItem[] {
  const map = new Map<string, WikiCatalogListItem>();
  for (const item of items) {
    const key = item.url.toLowerCase();
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}
