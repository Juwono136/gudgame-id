/** Shared hostname normalization for scrape-host admin UI and API. */
export function normalizeScrapeHostnameInput(raw: string): string {
  let trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";

  if (trimmed.includes("://") || trimmed.includes("/")) {
    try {
      const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
      trimmed = new URL(withProtocol).hostname.toLowerCase();
    } catch {
      trimmed = trimmed
        .replace(/^https?:\/\//, "")
        .split("/")[0]!
        .split(":")[0]!
        .trim();
    }
  }

  return trimmed.replace(/\.$/, "");
}
