import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";
import { guardApiRequest } from "@/lib/api/guard-request";
import {
  assertLoginNotLocked,
  clearLoginAttempts,
  recordFailedLogin,
} from "@/lib/security/auth-lockout";
import { applySecurityHeaders } from "@/lib/security/headers";
import { getTrustedClientIp } from "@/lib/security/client-ip";

const handler = toNextJsHandler(auth);

const EMAIL_SIGN_IN_SUFFIX = "/sign-in/email";

function isEmailSignIn(pathname: string): boolean {
  return pathname.endsWith(EMAIL_SIGN_IN_SUFFIX);
}

async function withAuthSecurity(
  request: Request,
  run: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  const ip = getTrustedClientIp(request);

  if (request.method === "POST" && isEmailSignIn(url.pathname)) {
    await guardApiRequest(request, { tier: "auth", skipOriginCheck: false });

    let email: string | undefined;
    try {
      const body = (await request.clone().json()) as { email?: string };
      email = body.email?.trim().toLowerCase();
    } catch {
      email = undefined;
    }

    if (email) {
      await assertLoginNotLocked(ip, email);
    }

    const response = applySecurityHeaders(await run());

    if (email) {
      if (response.ok) {
        await clearLoginAttempts(ip, email);
      } else if (response.status === 401 || response.status === 400) {
        await recordFailedLogin(ip, email);
      }
    }

    return response;
  }

  if (request.method === "POST") {
    const tier =
      url.pathname.includes("sign-up") || url.pathname.includes("forget-password")
        ? "register"
        : "auth";
    await guardApiRequest(request, { tier });
  }

  return applySecurityHeaders(await run());
}

export async function GET(request: Request) {
  return withAuthSecurity(request, () => handler.GET(request));
}

export async function POST(request: Request) {
  return withAuthSecurity(request, () => handler.POST(request));
}
