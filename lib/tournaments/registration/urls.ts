/** Client-safe registration flow URLs (no server-only imports). */

export function registrationConfirmUrl(
  sportSlug: string,
  slug: string,
  registrationId: string,
): string {
  return `/sports/${sportSlug}/tournaments/${slug}/register/confirm?registrationId=${registrationId}`;
}

export function registrationCheckoutUrl(
  sportSlug: string,
  slug: string,
  registrationId: string,
): string {
  return `/sports/${sportSlug}/tournaments/${slug}/register/checkout?registrationId=${registrationId}`;
}

export type ActiveRegistrationStatus = "awaiting_confirmation" | "pending_payment";

export function isActiveRegistrationStatus(
  status: string | null | undefined,
): status is ActiveRegistrationStatus {
  return status === "awaiting_confirmation" || status === "pending_payment";
}
