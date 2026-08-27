import { AppError } from "@/lib/errors";

const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

/**
 * Normalize an Indonesian-style phone number to digits-only with country code.
 * Accepts input like "0812 3456 7890", "+62 812-3456-7890", "62812...".
 */
export function normalizePartnerPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new AppError("Phone number is required", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  let digits = trimmed.replace(/[^\d+]/g, "");
  digits = digits.startsWith("+") ? digits.slice(1) : digits;
  digits = digits.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (!digits.startsWith("62")) {
    digits = `62${digits}`;
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    throw new AppError("Phone number must have 10-15 digits", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  return digits;
}

/** Non-throwing check for form-level validation. */
export function isValidPartnerPhone(raw: string): boolean {
  try {
    normalizePartnerPhone(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Placeholder phones created for Google-only / oauth members without a real number
 * (`p` + hex from identity id). Not valid for tournament registration forms.
 */
export function isSyntheticPartnerPhone(phone: string): boolean {
  return /^p[a-f0-9]{8,}$/i.test(phone.trim());
}

/** Phone suitable to autofill captain fields — skips empty / synthetic / invalid. */
export function partnerPhoneForAutofill(
  phone: string | null | undefined,
): string | null {
  if (!phone?.trim()) return null;
  if (isSyntheticPartnerPhone(phone)) return null;
  if (!isValidPartnerPhone(phone)) return null;
  return phone.trim();
}
