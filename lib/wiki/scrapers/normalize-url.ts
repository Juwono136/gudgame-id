/** Normalize user-pasted scrape URLs (add https:// when protocol is omitted). */
export function normalizeScrapeInputUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
