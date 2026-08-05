import sanitizeHtml from "sanitize-html";
import { normalizeLinkHref } from "@/lib/wiki/normalize-link";

function isSafeRichImageSrc(src: string | undefined): string | null {
  if (!src?.trim()) return null;
  const trimmed = src.trim();
  // Same-origin media proxy / static assets, or https CDN.
  if (
    trimmed.startsWith("/api/media/") ||
    trimmed.startsWith("/images/") ||
    trimmed.startsWith("https://")
  ) {
    // Strip dangerous characters; keep cache-bust query on media paths.
    if (trimmed.includes("javascript:") || trimmed.includes("data:")) return null;
    return trimmed.slice(0, 800);
  }
  return null;
}

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "blockquote",
    "a",
    "div",
    "img",
    "figure",
    "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    figure: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    b: "strong",
    i: "em",
    div: "p",
    h1: "h2",
    a: (_tagName, attribs) => {
      const href = normalizeLinkHref(attribs.href);
      if (!href) {
        return { tagName: "span", attribs: {} };
      }
      return {
        tagName: "a",
        attribs: {
          href,
          target: "_blank",
          rel: "noopener noreferrer",
          ...(attribs.title ? { title: attribs.title } : {}),
        },
      };
    },
    img: (_tagName, attribs) => {
      const src = isSafeRichImageSrc(attribs.src);
      if (!src) {
        return { tagName: "span", attribs: {} };
      }
      const alt = typeof attribs.alt === "string" ? attribs.alt.trim().slice(0, 200) : "";
      return {
        tagName: "img",
        attribs: {
          src,
          alt,
          loading: "lazy",
          ...(attribs.title ? { title: String(attribs.title).slice(0, 200) } : {}),
        },
      };
    },
  },
};

/** Normalize editor/browser HTML to a safe, displayable subset. */
export function sanitizeRichText(html: string | undefined | null): string {
  if (!html?.trim()) return "";
  const cleaned = sanitizeHtml(html.trim(), RICH_TEXT_OPTIONS);
  return cleaned.replace(/<p>\s*<\/p>/gi, "").trim();
}

export function plainTextToRichHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return sanitizeRichText(trimmed);
  const paragraphs = trimmed
    .split(/\n\n+/)
    .map((p) => `<p>${sanitizeHtml(p.replace(/\n/g, "<br />"), { allowedTags: ["br"] })}</p>`)
    .join("");
  return sanitizeRichText(paragraphs);
}

/** Use when reading stored values that may be legacy plain text or browser HTML. */
export function coerceRichHtmlField(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    const converted = plainTextToRichHtml(trimmed);
    return converted || null;
  }
  const sanitized = sanitizeRichText(trimmed);
  return sanitized || null;
}

/** Use when persisting rich text from forms/API. */
export function sanitizeTournamentRichField(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const sanitized = sanitizeRichText(value.trim());
  return sanitized || null;
}

export function hasRichTextContent(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  if (/<img\b/i.test(value)) return true;
  const plain = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 0;
}
