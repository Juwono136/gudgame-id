import "server-only";

import { AppError } from "@/lib/errors";

function getAllowedOrigins(): string[] {
  const values = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];

  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])];
}

/**
 * Reject cross-site POST/PUT/PATCH/DELETE when Origin is present and not allowlisted.
 * Browsers send Origin on CORS and many same-site form submissions.
 */
export function assertTrustedOrigin(request: Request): void {
  if (process.env.NODE_ENV !== "production") return;

  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.get("origin");
  if (!origin) return;

  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return;

  if (!allowed.includes(origin)) {
    throw new AppError("Request origin is not allowed", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
