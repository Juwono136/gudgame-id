import "server-only";

import { AppError } from "@/lib/errors";
import { decodeHtmlEntities } from "@/lib/wiki/scrapers/parse-html";
import { fetchHtmlForScrape } from "@/lib/wiki/scrapers/fetch-html";
import type { WikiCatalogDiscovery, WikiCatalogListItem } from "@/lib/wiki/scrapers/types";
import { assertScrapeUrlAllowed } from "@/lib/wiki/scrapers/security";
import { discoverByHost } from "@/lib/wiki/scrapers/discover-sites";
import { normalizeWikiSourceUrl } from "@/lib/wiki/normalize-source-url";

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

function extractImageFromFragment(fragment: string, baseUrl: URL): string | undefined {
  const patterns = [
    /src=["']((?:https?:)?\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /data-(?:src|lazy-src|bgset)=["']([^"']+)["']/i,
    /srcset=["']([^"'\s]+)/i,
  ];
  for (const re of patterns) {
    const m = fragment.match(re);
    if (!m?.[1]) continue;
    const raw = m[1].split(/\s+/)[0]!;
    if (raw.includes("cdn.shopify.com") || raw.includes(".jpg") || raw.includes(".png")) {
      const resolved = resolveUrl(raw, baseUrl);
      if (resolved && !resolved.includes("data:image") && !resolved.includes("placeholder")) {
        return resolved;
      }
    }
  }
  return undefined;
}

/** Extract product links from PadelTop / Shopify-style HTML */
export function discoverPadeltopProducts(html: string, baseUrl: URL): WikiCatalogListItem[] {
  const seen = new Set<string>();
  const items: WikiCatalogListItem[] = [];
  const imageByUrl = new Map<string, string>();

  const cardRe =
    /<(?:div|li|article)[^>]*class=["'][^"']*(?:product|grid__item|card)[^"']*["'][^>]*>([\s\S]{0,4000}?)<\/(?:div|li|article)>/gi;
  let cardMatch: RegExpExecArray | null;
  while ((cardMatch = cardRe.exec(html)) !== null) {
    const block = cardMatch[0]!;
    const hrefMatch = block.match(/href=["']([^"']*\/products\/([^"'?#/]+))["']/i);
    if (!hrefMatch?.[1]) continue;
    const full = resolveUrl(hrefMatch[1], baseUrl);
    if (!full) continue;
    const key = full.split("?")[0]!;
    const img = extractImageFromFragment(block, baseUrl);
    if (img) imageByUrl.set(key, img);
  }

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
      const key = full.split("?")[0]!;

      let title = "";
      if (m[2]) {
        const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        title = decodeHtmlEntities(inner).slice(0, 200);
      }
      if (!title) {
        const slug = full.split("/products/")[1]?.split("?")[0]?.replace(/-/g, " ");
        title = slug ? decodeHtmlEntities(slug) : "Product";
      }

      const context = m[0] ?? "";
      const img =
        imageByUrl.get(key) ??
        extractImageFromFragment(context, baseUrl) ??
        extractImageFromFragment(html.slice(Math.max(0, (m.index ?? 0) - 500), (m.index ?? 0) + 1500), baseUrl);
      const priceMatch = context.match(/Rp\s?[\d.,]+/i);

      items.push({
        url: key,
        title: title.replace(/\s*\(RACKET\)\s*/gi, "").trim(),
        imageUrl: img,
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
  options?: { sportId?: string | null },
): Promise<WikiCatalogDiscovery> {
  const parsed = await assertScrapeUrlAllowed(url, options);
  void sportSlug;

  const { html, finalUrl } = await fetchHtmlForScrape(url, options);
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
    const key = normalizeWikiSourceUrl(item.url);
    if (!map.has(key)) map.set(key, { ...item, url: key });
  }
  return [...map.values()];
}
