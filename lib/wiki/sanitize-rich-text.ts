import sanitizeHtml from "sanitize-html";

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "blockquote",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
};

export function sanitizeRichText(html: string | undefined | null): string {
  if (!html?.trim()) return "";
  return sanitizeHtml(html.trim(), RICH_TEXT_OPTIONS);
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
