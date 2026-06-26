import "server-only";

import { decodeHtmlEntities } from "@/lib/wiki/scrapers/parse-html";
import type { WikiCatalogListItem } from "@/lib/wiki/scrapers/types";

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

function dedupe(items: WikiCatalogListItem[]): WikiCatalogListItem[] {
  const map = new Map<string, WikiCatalogListItem>();
  for (const item of items) {
    const key = item.url.toLowerCase().split("?")[0]!;
    if (!map.has(key)) map.set(key, { ...item, url: key });
  }
  return [...map.values()];
}

function extractLinksByPatterns(
  html: string,
  base: URL,
  pathPatterns: RegExp[],
): WikiCatalogListItem[] {
  const seen = new Set<string>();
  const items: WikiCatalogListItem[] = [];

  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1]!;
    const full = resolveUrl(href, base);
    if (!full || seen.has(full)) continue;

    const path = new URL(full).pathname.toLowerCase();
    if (!pathPatterns.some((re) => re.test(path))) continue;

    seen.add(full);
    const slug = path.split("/").filter(Boolean).pop() ?? "item";
    items.push({
      url: full.split("?")[0]!,
      title: decodeHtmlEntities(slug.replace(/-/g, " ")),
    });
  }

  return items;
}

export function discoverPadeltopProducts(html: string, base: URL): WikiCatalogListItem[] {
  const items: WikiCatalogListItem[] = [];
  const re = /href=["']([^"']*\/products\/[^"'?#]+)["']/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const full = resolveUrl(m[1]!, base);
    if (!full || seen.has(full)) continue;
    seen.add(full);
    items.push({
      url: full.split("?")[0]!,
      title: decodeHtmlEntities(
        (full.split("/products/")[1] ?? "product").replace(/-/g, " "),
      ),
    });
  }
  return items;
}

export function discoverPadelfulProducts(html: string, base: URL): WikiCatalogListItem[] {
  return extractLinksByPatterns(html, base, [
    /^\/en\/rackets\/[^/]+$/i,
    /^\/rackets\/[^/]+$/i,
    /^\/en\/racket\/[^/]+$/i,
  ]);
}

export function discoverPadelRacketProducts(html: string, base: URL): WikiCatalogListItem[] {
  return extractLinksByPatterns(html, base, [
    /^\/en\/[^/]+\/[^/]+$/i,
    /\/product\//i,
    /\/products\//i,
    /\/p\//i,
  ]);
}

export function discoverDecathlonProducts(html: string, base: URL): WikiCatalogListItem[] {
  return extractLinksByPatterns(html, base, [
    /\/p\//i,
    /\/product\//i,
    /\/products\//i,
    /padel.*\.html$/i,
    /racket.*\.html$/i,
  ]);
}

export function discoverGenericProducts(html: string, base: URL): WikiCatalogListItem[] {
  const combined = [
    ...extractLinksByPatterns(html, base, [
      /\/products?\//i,
      /\/p\//i,
      /\/item\//i,
      /\/rackets?\//i,
    ]),
  ];
  return dedupe(combined);
}

export function discoverByHost(
  host: string,
  html: string,
  base: URL,
): WikiCatalogListItem[] {
  const h = host.toLowerCase();
  if (h.includes("padeltop")) return discoverPadeltopProducts(html, base);
  if (h.includes("padelful")) return discoverPadelfulProducts(html, base);
  if (h.includes("padelracket")) return discoverPadelRacketProducts(html, base);
  if (h.includes("decathlon")) return discoverDecathlonProducts(html, base);
  return discoverGenericProducts(html, base);
}
