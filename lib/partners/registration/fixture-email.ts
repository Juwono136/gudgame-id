import "server-only";

/** Dev-only partner seed players (`npm run db:seed:partner-bestie-cup`). */
export const PARTNER_FIXTURE_EMAIL_DOMAIN = "bestie-fixture.local";

export function isPartnerFixtureEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith(`@${PARTNER_FIXTURE_EMAIL_DOMAIN}`) ||
    normalized.endsWith("@partner.invalid")
  );
}

/** Never send SMTP for dummy roster contacts or while a DB seed script is running. */
export function shouldSkipPartnerRegistrationEmail(email: string | null | undefined): boolean {
  if (process.env.DB_SCRIPT_MODE === "true") return true;
  return isPartnerFixtureEmail(email);
}
