import "server-only";

import {
  decodeHtmlEntities,
  extractJsonLdProduct,
  extractMetaContent,
  stripHtmlTags,
} from "@/lib/wiki/scrapers/parse-html";

export function resolveAbsoluteUrl(
  raw: string | null | undefined,
  baseUrl: string | URL,
): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = decodeHtmlEntities(raw.trim());
  try {
    const base = typeof baseUrl === "string" ? new URL(baseUrl) : baseUrl;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (trimmed.startsWith("/")) return `${base.origin}${trimmed}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return new URL(trimmed, base).toString();
  } catch {
    return undefined;
  }
}

function pickImageFromJsonLd(image: unknown, baseUrl: URL): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") {
    return resolveAbsoluteUrl(image, baseUrl);
  }
  if (Array.isArray(image)) {
    for (const item of image) {
      const resolved = pickImageFromJsonLd(item, baseUrl);
      if (resolved) return resolved;
    }
    return undefined;
  }
  if (typeof image === "object") {
    const obj = image as Record<string, unknown>;
    if (typeof obj.url === "string") {
      return resolveAbsoluteUrl(obj.url, baseUrl);
    }
    if (typeof obj.contentUrl === "string") {
      return resolveAbsoluteUrl(obj.contentUrl, baseUrl);
    }
  }
  return undefined;
}

export function extractProductImage(
  html: string,
  baseUrl: URL,
  product: Record<string, unknown> | null,
): string | undefined {
  const ogImage = extractMetaContent(html, "og:image");
  const ogSecure = extractMetaContent(html, "og:image:secure_url");
  const twitterImage = extractMetaContent(html, "twitter:image");

  const candidates = [
    ogSecure,
    ogImage,
    twitterImage,
    pickImageFromJsonLd(product?.image, baseUrl),
  ];

  for (const raw of candidates) {
    const resolved = raw ? resolveAbsoluteUrl(raw, baseUrl) : undefined;
    if (resolved && !resolved.includes("data:image")) return resolved;
  }

  const shopifyFeatured = html.match(
    /(?:featured_image|featured_media)[^:]*:\s*[^,]*?(?:https?:)?\/\/cdn\.shopify\.com\/[^"'\s)]+/i,
  );
  if (shopifyFeatured) {
    const urlMatch = shopifyFeatured[0].match(/((?:https?:)?\/\/cdn\.shopify\.com\/[^"'\s)]+)/i);
    if (urlMatch?.[1]) {
      const resolved = resolveAbsoluteUrl(urlMatch[1], baseUrl);
      if (resolved) return resolved;
    }
  }

  const productImg = html.match(
    /<img[^>]+(?:class|id)=["'][^"']*product[^"']*["'][^>]+src=["']([^"']+)["']/i,
  );
  if (productImg?.[1]) {
    const resolved = resolveAbsoluteUrl(productImg[1], baseUrl);
    if (resolved && !resolved.includes("data:image")) return resolved;
  }

  const lazyImg = html.match(
    /data-(?:src|lazy-src|zoom-image)=["']((?:https?:)?\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
  );
  if (lazyImg?.[1]) {
    const resolved = resolveAbsoluteUrl(lazyImg[1], baseUrl);
    if (resolved) return resolved;
  }

  return undefined;
}

export type ExtractedProductPrice = {
  priceIdr: number | null;
  priceDisplay: string;
};

export function extractProductPrice(
  html: string,
  product: Record<string, unknown> | null,
): ExtractedProductPrice {
  let priceIdr: number | null = null;
  let priceDisplay = "";

  if (product?.offers) {
    const offers = product.offers as Record<string, unknown> | Record<string, unknown>[];
    const offerList = Array.isArray(offers) ? offers : [offers];
    for (const offer of offerList) {
      if (!offer || typeof offer !== "object" || !("price" in offer)) continue;
      const p = Number(offer.price);
      const currency = String(offer.priceCurrency ?? "IDR").toUpperCase();
      if (!Number.isFinite(p) || p <= 0) continue;
      priceIdr = Math.round(p);
      priceDisplay =
        currency === "IDR"
          ? new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(priceIdr)
          : `${currency} ${p}`;
      break;
    }
  }

  if (!priceDisplay) {
    const priceMatch = html.match(/Rp\s?[\d.,]+|€\s?[\d.,]+|\$\s?[\d.,]+/i);
    if (priceMatch) {
      priceDisplay = priceMatch[0].trim();
      const digits = priceMatch[0].replace(/[^\d]/g, "");
      if (digits) {
        const n = Number(digits);
        if (Number.isFinite(n) && n > 0) priceIdr = n;
      }
    }
  }

  return { priceIdr, priceDisplay };
}

export type ExtractedProductFields = {
  displayName: string;
  summary: string | undefined;
  primaryImageUrl: string | undefined;
  priceIdr: number | null;
  priceDisplay: string;
  brand: string;
};

const BRAND_PATTERN =
  /^(ADIDAS|BABOLAT|BULLPADEL|HEAD|NOX|SIUX|WILSON|BLACK CROWN|HIROSTAR|DECATHLON|STARVIE|KUIKMA|DUNLOP)/i;

export function extractProductFieldsFromHtml(
  html: string,
  finalUrl: URL,
): ExtractedProductFields {
  const product = extractJsonLdProduct(html);
  const ogTitle = extractMetaContent(html, "og:title");
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

  let summary = ogDesc ? stripHtmlTags(ogDesc) : "";
  if (product?.description && typeof product.description === "string") {
    summary = stripHtmlTags(product.description).slice(0, 800);
  }

  const { priceIdr, priceDisplay } = extractProductPrice(html, product);
  const primaryImageUrl = extractProductImage(html, finalUrl, product);
  const brandMatch = displayName.match(BRAND_PATTERN);

  return {
    displayName,
    summary: summary || undefined,
    primaryImageUrl,
    priceIdr,
    priceDisplay,
    brand: brandMatch?.[1]?.toUpperCase() ?? "",
  };
}
