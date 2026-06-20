import sanitizeHtml from "sanitize-html";
import { normalizeLinkHref } from "@/lib/wiki/normalize-link";

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
    "h2",
    "h3",
    "blockquote",
    "a",
    "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    b: "strong",
    i: "em",
    div: "p",
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
  const plain = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 0;
}
