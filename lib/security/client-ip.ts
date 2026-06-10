import "server-only";

/**
 * Headers checked in order when behind Cloudflare Tunnel / reverse proxy.
 * Only trust these when the app is not directly exposed to the internet.
 */
const IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
] as const;

function normalizeIp(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }
  return trimmed;
}

/** Best-effort client IP for rate limiting and audit logs. */
export function getTrustedClientIp(request: Request): string {
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);
    if (!value) continue;

    const candidate = header === "x-forwarded-for" ? value.split(",")[0] : value;
    const ip = normalizeIp(candidate ?? "");
    if (ip) return ip;
  }

  return "unknown";
}
