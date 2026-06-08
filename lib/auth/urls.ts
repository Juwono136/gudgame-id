import { authRoutes } from "@/lib/constants/routes";

/** Public app origin for auth redirects (client-safe when NEXT_PUBLIC_APP_URL is set). */
export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAppOrigin()}${authRoutes.resetPassword}`;
}
