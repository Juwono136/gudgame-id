import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { partnerPublicRoutes, publicSportRoutes } from "@/lib/constants/routes";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateInviteCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]!;
  }
  return code;
}

export function hashInviteSecret(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export function getDefaultInviteExpiry(days = 7): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function buildInviteUrl(input: {
  sportSlug: string;
  slug: string;
  token: string;
  kind: "access" | "player";
  /** When set, invite lands on partner white-label accept page (not /sports/…). */
  partnerSlug?: string | null;
}): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = input.partnerSlug
    ? partnerPublicRoutes.tournamentInvite(input.partnerSlug, input.slug)
    : publicSportRoutes.tournamentInvite(input.sportSlug, input.slug);
  return `${base}${path}?token=${encodeURIComponent(input.token)}&kind=${input.kind}`;
}
