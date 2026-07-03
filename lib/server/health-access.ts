import { timingSafeEqual } from "node:crypto";

function safeCompareToken(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Health auth must not call getServerEnv() — invalid production env would throw
 * and turn a diagnostic 503 into an opaque HTTP 500.
 */
export function isHealthCheckAuthorized(request: Request): boolean {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const token = process.env.HEALTH_CHECK_TOKEN?.trim();

  if (nodeEnv !== "production" || !token) {
    return true;
  }

  const provided =
    request.headers.get("x-health-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided) return false;
  return safeCompareToken(provided, token);
}
