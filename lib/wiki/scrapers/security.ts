import "server-only";

import { AppError } from "@/lib/errors";
import { getEnabledScrapeHostnames } from "@/lib/wiki/scrape-hosts/service";

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  if (h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fe80:")) return true;
  return false;
}

export async function assertScrapeUrlAllowed(
  rawUrl: string,
  options?: { sportId?: string | null },
): Promise<URL> {
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

  const allowed = await getEnabledScrapeHostnames(options?.sportId);
  if (!allowed.has(host)) {
    throw new AppError(
      `Scraping is not enabled for this site (${host}). Add the host in Data source settings.`,
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  return parsed;
}
