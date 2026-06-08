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
  getDefaultDashboardUrl,
  isPathAllowedForRoles,
  isRoleProtectedPath,
  resolveSafeCallbackUrl,
} from "@/lib/roles/route-access";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
};

type SessionProxyContext = {
  roles: AppRole[];
  mustChangePassword: boolean;
  accountInactive: boolean;
};

async function fetchSessionContext(
  request: NextRequest,
): Promise<SessionProxyContext | null> {
  try {
    const res = await fetch(new URL("/api/account/session-context", request.url), {
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

  if (isAuthenticated) {
    const sessionCtx = await fetchSessionContext(request);

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
      const target = sessionCtx
        ? resolveSafeCallbackUrl(callbackUrl, sessionCtx.roles)
        : dashboardRoutes.home;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  response.headers.set("X-Request-Path", pathname);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|images/|manifest.webmanifest|api/).*)",
  ],
};
