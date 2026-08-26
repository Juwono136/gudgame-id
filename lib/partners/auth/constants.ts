/** Partner player session lifetime (sliding window via touch). */
export const PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 14; // 14 days

export const PARTNER_PLAYER_EMAIL_VERIFY_EXPIRES_IN_SECONDS = 60 * 60 * 24; // 24 hours

export const PARTNER_PLAYER_PASSWORD_RESET_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/** Cookie name prefix — full name is `gg_pps_<partnerSlug>`. Path=/ so APIs receive it. */
export const PARTNER_PLAYER_SESSION_COOKIE_PREFIX = "gg_pps_";

export function partnerPlayerSessionCookieName(partnerSlug: string): string {
  const safe = partnerSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48);
  return `${PARTNER_PLAYER_SESSION_COOKIE_PREFIX}${safe || "unknown"}`;
}
