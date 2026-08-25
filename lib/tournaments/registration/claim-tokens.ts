import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { publicSportRoutes } from "@/lib/constants/routes";

export function generateRosterClaimToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRosterClaimToken(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Claim window: through tournament end + 7 day grace (field-friendly). */
export function getRosterClaimExpiry(tournamentEndsAt: Date | string | null | undefined): Date {
  const end = tournamentEndsAt ? new Date(tournamentEndsAt) : new Date();
  const base = Number.isNaN(end.getTime()) ? new Date() : end;
  const expires = new Date(base);
  expires.setDate(expires.getDate() + 7);
  return expires;
}

export function buildRosterClaimUrl(input: {
  sportSlug: string;
  slug: string;
  token: string;
}): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = publicSportRoutes.tournamentClaim(input.sportSlug, input.slug);
  return `${base}${path}?token=${encodeURIComponent(input.token)}`;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}
