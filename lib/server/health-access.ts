import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/config/env.server";

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

/** In production, optional HEALTH_CHECK_TOKEN protects detailed infra responses. */
export function isHealthCheckAuthorized(request: Request): boolean {
  const env = getServerEnv();
  const token = env.HEALTH_CHECK_TOKEN;

  if (env.NODE_ENV !== "production" || !token) {
    return true;
  }

  const provided =
    request.headers.get("x-health-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided) return false;
  return safeCompareToken(provided, token);
}
