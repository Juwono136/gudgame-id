import "server-only";

import { cookies } from "next/headers";
import {
  PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS,
  partnerPlayerSessionCookieName,
} from "@/lib/partners/auth/constants";

export async function setPartnerPlayerSessionCookie(
  partnerSlug: string,
  token: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(partnerPlayerSessionCookieName(partnerSlug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS,
  });
}

export async function clearPartnerPlayerSessionCookie(
  partnerSlug: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(partnerPlayerSessionCookieName(partnerSlug), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readPartnerPlayerSessionToken(
  partnerSlug: string,
): Promise<string | null> {
  const jar = await cookies();
  return jar.get(partnerPlayerSessionCookieName(partnerSlug))?.value ?? null;
}

/** Read cookie from a raw Request (API routes). */
export function readPartnerPlayerSessionTokenFromRequest(
  request: Request,
  partnerSlug: string,
): string | null {
  const name = partnerPlayerSessionCookieName(partnerSlug);
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("=") || "");
    }
  }
  return null;
}

export function buildSetCookieHeader(
  partnerSlug: string,
  token: string | null,
): string {
  const name = partnerPlayerSessionCookieName(partnerSlug);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  if (!token) {
    return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  }
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS}${secure}`;
}
