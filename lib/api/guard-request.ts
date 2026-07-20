import "server-only";

import { enforceRateLimit } from "@/lib/api/rate-limit";
import { assertTrustedOrigin } from "@/lib/security/origin";
import { getTrustedClientIp } from "@/lib/security/client-ip";

export const API_RATE_LIMITS = {
  auth: { limit: 20, windowSeconds: 60 },
  register: { limit: 5, windowSeconds: 3600 },
  passwordReset: { limit: 5, windowSeconds: 3600 },
  sensitive: { limit: 30, windowSeconds: 60 },
  general: { limit: 120, windowSeconds: 60 },
  admin: { limit: 90, windowSeconds: 60 },
  webhook: { limit: 120, windowSeconds: 60 },
  maps: { limit: 40, windowSeconds: 60 },
  upload: { limit: 20, windowSeconds: 60 },
} as const;

export type ApiRateLimitTier = keyof typeof API_RATE_LIMITS;

type GuardOptions = {
  tier?: ApiRateLimitTier;
  /** Extra bucket suffix (e.g. user id) */
  keySuffix?: string;
  /** Skip Origin check (webhooks, health) */
  skipOriginCheck?: boolean;
};

export async function guardApiRequest(
  request: Request,
  options: GuardOptions = {},
): Promise<void> {
  if (!options.skipOriginCheck) {
    assertTrustedOrigin(request);
  }

  const tier = options.tier ?? "general";
  const limits = API_RATE_LIMITS[tier];
  const ip = getTrustedClientIp(request);
  const suffix = options.keySuffix ? `:${options.keySuffix}` : "";

  await enforceRateLimit({
    key: `api:${tier}:${ip}${suffix}`,
    limit: limits.limit,
    windowSeconds: limits.windowSeconds,
    failClosedInProduction:
      tier === "auth" ||
      tier === "register" ||
      tier === "passwordReset" ||
      tier === "general" ||
      tier === "sensitive" ||
      tier === "upload",
  });
}
