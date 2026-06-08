import "server-only";

import { AppError } from "@/lib/errors";

const DEFAULT_ALLOWED_HOSTS = [
  "padeltop.id",
  "www.padeltop.id",
  "padelful.com",
  "www.padelful.com",
  "padelracket.id",
  "www.padelracket.id",
  "decathlon.co.id",
  "www.decathlon.co.id",
];

function getAllowedHosts(): Set<string> {
  const env = process.env.WIKI_SCRAPE_ALLOWED_HOSTS?.trim();
  const list = env ? env.split(",").map((h) => h.trim().toLowerCase()) : DEFAULT_ALLOWED_HOSTS;
  return new Set(list.filter(Boolean));
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  if (h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fe80:")) return true;
  return false;
}

export function assertScrapeUrlAllowed(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new AppError("Invalid URL", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  if (parsed.protocol !== "https:") {
    throw new AppError("Only HTTPS URLs are allowed for scraping", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const host = parsed.hostname.toLowerCase();
  if (isPrivateHost(host)) {
    throw new AppError("URL host is not allowed", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const allowed = getAllowedHosts();
  if (!allowed.has(host)) {
    throw new AppError(
      `Scraping is not enabled for this site. Allowed: ${[...allowed].join(", ")}`,
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  return parsed;
}
