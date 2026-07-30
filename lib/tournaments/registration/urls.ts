/** Client-safe registration flow URLs (no server-only imports). */

export function registrationConfirmUrl(
  sportSlug: string,
  slug: string,
  registrationId: string,
  partnerSlug?: string | null,
): string {
  const base = partnerSlug
    ? `/${partnerSlug}/tournaments/${slug}`
    : `/sports/${sportSlug}/tournaments/${slug}`;
  return `${base}/register/confirm?registrationId=${registrationId}`;
}

export function registrationCheckoutUrl(
  sportSlug: string,
  slug: string,
  registrationId: string,
  partnerSlug?: string | null,
): string {
  const base = partnerSlug
    ? `/${partnerSlug}/tournaments/${slug}`
    : `/sports/${sportSlug}/tournaments/${slug}`;
  return `${base}/register/checkout?registrationId=${registrationId}`;
}

export function registrationSuccessUrl(
  sportSlug: string,
  slug: string,
  registrationId: string,
  partnerSlug?: string | null,
): string {
  const base = partnerSlug
    ? `/${partnerSlug}/tournaments/${slug}`
    : `/sports/${sportSlug}/tournaments/${slug}`;
  return `${base}/register/success?registrationId=${registrationId}`;
}

export type ActiveRegistrationStatus = "awaiting_confirmation" | "pending_payment";

export function isActiveRegistrationStatus(
  status: string | null | undefined,
): status is ActiveRegistrationStatus {
  return status === "awaiting_confirmation" || status === "pending_payment";
}
