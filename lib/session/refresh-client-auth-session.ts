"use client";

import { authClient } from "@/lib/auth/client";

/**
 * Sync Better Auth React session cache after custom auth flows (Firebase Google plugin)
 * that set cookies server-side without going through authClient.signIn.*.
 */
export async function refreshClientAuthSession(): Promise<void> {
  try {
    await authClient.getSession({
      fetchOptions: {
        cache: "no-store",
      },
    });
  } catch {
    // Non-fatal — session-context may still provide user profile fields.
  }
}
