import { partnerPublicRoutes } from "@/lib/constants/routes";

export function partnerAuthRoutes(partnerSlug: string) {
  return {
    login: `/${partnerSlug}/login`,
    signup: `/${partnerSlug}/signup`,
    forgotPassword: `/${partnerSlug}/forgot-password`,
    forgotPasswordSent: `/${partnerSlug}/forgot-password/sent`,
    resetPassword: `/${partnerSlug}/reset-password`,
    verifyEmail: `/${partnerSlug}/verify-email`,
    checkEmail: `/${partnerSlug}/check-email`,
    account: `/${partnerSlug}/account`,
    home: partnerPublicRoutes.home(partnerSlug),
  } as const;
}

/**
 * Only allow post-login redirects under the same partner slug
 * (never Gud Game /dashboard or another partner).
 */
export function sanitizePartnerCallbackUrl(
  partnerSlug: string,
  callbackUrl: string | null | undefined,
): string {
  const home = partnerPublicRoutes.home(partnerSlug);
  if (!callbackUrl) return home;
  let path = callbackUrl.trim();
  try {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const u = new URL(path);
      path = u.pathname + u.search;
    }
  } catch {
    return home;
  }

  // Protocol-relative / backslash tricks
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return home;
  }

  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return home;
  }
  if (
    decoded.includes("..") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    !decoded.startsWith("/")
  ) {
    return home;
  }

  const prefix = `/${partnerSlug}`;
  if (decoded === prefix || decoded.startsWith(`${prefix}/`)) {
    // Keep original query encoding from `path` when safe
    return path.startsWith(prefix) || path === prefix ? path : decoded;
  }
  return home;
}
