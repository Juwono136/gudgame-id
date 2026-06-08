import "server-only";
import { authRoutes } from "@/lib/constants/routes";

export function getBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getPasswordResetRedirectUrl(): string {
  return `${getBaseUrl()}${authRoutes.resetPassword}`;
}
