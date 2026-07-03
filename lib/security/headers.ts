import type { NextResponse } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Production Content-Security-Policy tuned for Next.js App Router.
 * `unsafe-inline` for styles/scripts is required for Next.js hydration.
 */
function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://maps.googleapis.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://photon.komoot.io https://nominatim.openstreetmap.org https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://maps.google.com https://www.google.com https://www.openstreetmap.org",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (IS_PRODUCTION) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "X-DNS-Prefetch-Control": "on",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": buildContentSecurityPolicy(),
  };

  if (IS_PRODUCTION) {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

export function applySecurityHeaders<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(getSecurityHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export function applySecurityHeadersToNextResponse(response: NextResponse): NextResponse {
  return applySecurityHeaders(response);
}
