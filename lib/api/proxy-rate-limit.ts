import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getTrustedClientIp } from "@/lib/security/client-ip";
import { applySecurityHeadersToNextResponse } from "@/lib/security/headers";

/** Global API gateway limit — complements per-route guardApiRequest. */
const GLOBAL_API_LIMIT = 180;
const GLOBAL_API_WINDOW_SECONDS = 60;

/**
 * Paths with their own stricter limits or special auth (skip double-bucket pressure).
 * Still protected by route-level guards / webhook tokens.
 */
function shouldSkipGlobalApiLimit(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/health/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/auth/")
  );
}

/**
 * Soft edge rate limit for all other /api/* traffic.
 * Returns a 429 response when exceeded; null to continue.
 */
export async function maybeRateLimitApiProxy(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || shouldSkipGlobalApiLimit(pathname)) {
    return null;
  }

  const ip = getTrustedClientIp(request);
  const result = await checkRateLimit({
    key: `api:gateway:${ip}`,
    limit: GLOBAL_API_LIMIT,
    windowSeconds: GLOBAL_API_WINDOW_SECONDS,
    failClosedInProduction: true,
  });

  if (result.allowed) return null;

  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000),
  );

  const res = NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
  return applySecurityHeadersToNextResponse(res);
}
