/** Ensure editor/user URLs open correctly in anchors. */
export function normalizeLinkHref(href: string | undefined | null): string | null {
  if (!href?.trim()) return null;
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed) || trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return `https://${trimmed}`;
}
