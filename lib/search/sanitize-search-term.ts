/** Max length accepted from public search inputs (query string / form). */
export const MAX_SEARCH_TERM_LENGTH = 100;

/**
 * Normalize a free-text search term for safe use in SQL ILIKE filters.
 * - Trims whitespace
 * - Strips LIKE wildcards (`%`, `_`) and backslashes to prevent pattern injection
 * - Caps length
 * Returns `undefined` when empty after sanitization.
 */
export function sanitizeSearchTerm(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw
    .trim()
    .replace(/[%_\\]/g, "")
    .slice(0, MAX_SEARCH_TERM_LENGTH);
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Build a case-insensitive contains pattern for `ilike`. */
export function toIlikeContainsPattern(term: string): string {
  return `%${term}%`;
}
