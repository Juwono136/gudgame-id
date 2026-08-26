import "server-only";

import { getBaseUrl } from "@/lib/auth/urls-server";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";

export function absolutePartnerAuthUrl(
  partnerSlug: string,
  path: string,
): string {
  const base = getBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function partnerVerifyEmailUrl(partnerSlug: string, token: string): string {
  const routes = partnerAuthRoutes(partnerSlug);
  return absolutePartnerAuthUrl(
    partnerSlug,
    `${routes.verifyEmail}?token=${encodeURIComponent(token)}`,
  );
}

export function partnerResetPasswordUrl(partnerSlug: string, token: string): string {
  const routes = partnerAuthRoutes(partnerSlug);
  return absolutePartnerAuthUrl(
    partnerSlug,
    `${routes.resetPassword}?token=${encodeURIComponent(token)}`,
  );
}
