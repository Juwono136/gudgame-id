import "server-only";

import { NextResponse } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildSetCookieHeader } from "@/lib/partners/auth/cookies";
import { requireActivePartner } from "@/lib/partners/auth/session";
import { sanitizePartnerCallbackUrl } from "@/lib/partners/auth/urls";
import { getTrustedClientIp } from "@/lib/security/client-ip";

export async function resolvePartnerFromParams(
  params: Promise<{ partnerSlug: string }>,
) {
  const { partnerSlug } = await params;
  return requireActivePartner(partnerSlug);
}

export function sessionCookieResponse<T>(
  partnerSlug: string,
  data: T,
  token: string | null,
  status = 200,
) {
  const res = jsonSuccess(data, status);
  res.headers.append("Set-Cookie", buildSetCookieHeader(partnerSlug, token));
  return res;
}

export function partnerAuthError(error: unknown) {
  return jsonError(error, "Partner authentication failed");
}

export function requestMeta(request: Request) {
  return {
    userAgent: request.headers.get("user-agent"),
    ipAddress: getTrustedClientIp(request),
  };
}

export function safeCallback(partnerSlug: string, callbackUrl?: string | null) {
  return sanitizePartnerCallbackUrl(partnerSlug, callbackUrl);
}

export function emptyOk() {
  return NextResponse.json({ success: true, data: { ok: true } });
}
