import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const PAYMENT_WINDOW_HOURS = 48;

/** Plain access token handed to the guest — never stored, only its hash. */
export function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashAccessToken(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export function getPartnerPaymentDueDate(): Date {
  return new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
}
