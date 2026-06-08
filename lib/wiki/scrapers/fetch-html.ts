import "server-only";

import { AppError } from "@/lib/errors";
import { assertScrapeUrlAllowed } from "@/lib/wiki/scrapers/security";

export const SCRAPE_FETCH_TIMEOUT_MS = 15_000;
export const SCRAPE_MAX_HTML_BYTES = 2_000_000;

export async function fetchHtmlForScrape(url: string): Promise<{ html: string; finalUrl: URL }> {
  const parsed = assertScrapeUrlAllowed(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "TandingBase-WikiBot/1.0",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new AppError(`Could not fetch page (${res.status})`, {
        code: "SERVICE_UNAVAILABLE",
        statusCode: 502,
      });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > SCRAPE_MAX_HTML_BYTES) {
      throw new AppError("Page is too large to process", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const html = new TextDecoder("utf-8").decode(buf);
    const finalUrl = new URL(res.url || parsed.toString());
    return { html, finalUrl };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch page. Check the URL and try again.", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 502,
    });
  } finally {
    clearTimeout(timeout);
  }
}
