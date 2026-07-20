import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  authRoutes,
  dashboardRoutes,
  isAuthPage,
  isChangePasswordRequiredPath,
  isProtectedPage,
  LEGACY_HOST_DASHBOARD_PATHS,
} from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import {
  getAccessDeniedRedirect,
  isPathAllowedForRoles,
  isRoleProtectedPath,
  resolveSafeCallbackUrl,
} from "@/lib/roles/route-access";
import { applySecurityHeadersToNextResponse } from "@/lib/security/headers";
import { maybeRateLimitApiProxy } from "@/lib/api/proxy-rate-limit";

type SessionProxyContext = {
  roles: AppRole[];
  mustChangePassword: boolean;
  accountInactive: boolean;
};

/**
 * Auth-sensitive paths that need DB-backed session flags/roles.
 * Public wiki/marketing pages skip this — keeps HMR refresh and public TTFB fast.
 */
function needsProxySessionContext(pathname: string): boolean {
  return (
    isAuthPage(pathname) ||
    isProtectedPage(pathname) ||
    isRoleProtectedPath(pathname) ||
    isChangePasswordRequiredPath(pathname)
  );
}

function needsProxyRoles(pathname: string): boolean {
  return isAuthPage(pathname) || isRoleProtectedPath(pathname);
}

async function fetchSessionContext(
  request: NextRequest,
  needRoles: boolean,
): Promise<SessionProxyContext | null> {
  try {
    const url = new URL("/api/account/proxy-session", request.url);
    if (needRoles) url.searchParams.set("roles", "1");

    const res = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        authenticated?: boolean;
        accountInactive?: boolean;
        roles?: AppRole[];
        mustChangePassword?: boolean;
      };
    };
    if (!res.ok || !json.success) return null;
    if (json.data?.accountInactive) {
      return {
        roles: [],
        mustChangePassword: false,
        accountInactive: true,
      };
    }
    if (!json.data?.authenticated) return null;
    return {
      roles: json.data.roles ?? [],
      mustChangePassword: json.data.mustChangePassword ?? false,
      accountInactive: false,
    };
  } catch {
    return null;
  }
}

function resolveLegacyHostDashboardRedirect(
  request: NextRequest,
  pathname: string,
): NextResponse | null {
  for (const legacyPath of LEGACY_HOST_DASHBOARD_PATHS) {
    if (pathname === legacyPath || pathname.startsWith(`${legacyPath}/`)) {
      const target = pathname.replace(legacyPath, dashboardRoutes.host);
      return NextResponse.redirect(new URL(target, request.url));
    }
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const limited = await maybeRateLimitApiProxy(request);
    if (limited) return limited;
    return applySecurityHeadersToNextResponse(NextResponse.next());
  }

  const legacyRedirect = resolveLegacyHostDashboardRedirect(request, pathname);
  if (legacyRedirect) return legacyRedirect;
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = Boolean(sessionCookie);

  if (
    !isAuthenticated &&
    (isProtectedPage(pathname) || isChangePasswordRequiredPath(pathname))
  ) {
    const loginUrl = new URL(authRoutes.login, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && needsProxySessionContext(pathname)) {
    const sessionCtx = await fetchSessionContext(
      request,
      needsProxyRoles(pathname),
    );

    if (sessionCtx?.accountInactive) {
      const loginUrl = new URL(authRoutes.login, request.url);
      loginUrl.searchParams.set("error", "account_inactive");
      if (pathname !== authRoutes.login) {
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    if (
      sessionCtx?.mustChangePassword &&
      !isChangePasswordRequiredPath(pathname)
    ) {
      return NextResponse.redirect(
        new URL(authRoutes.changePasswordRequired, request.url),
      );
    }

    if (
      sessionCtx &&
      isRoleProtectedPath(pathname) &&
      !isPathAllowedForRoles(pathname, sessionCtx.roles)
    ) {
      const target = getAccessDeniedRedirect(pathname, sessionCtx.roles);
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (isAuthPage(pathname) && sessionCtx) {
      if (sessionCtx.mustChangePassword) {
        return NextResponse.redirect(
          new URL(authRoutes.changePasswordRequired, request.url),
        );
      }
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      const target = resolveSafeCallbackUrl(callbackUrl, sessionCtx.roles);
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return applySecurityHeadersToNextResponse(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|images/|manifest.webmanifest).*)",
  ],
};
