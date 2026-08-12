"use client";

import { authClient } from "@/lib/auth/client";

/**
 * Sync Better Auth React `useSession()` cache after auth changes.
 *
 * Custom flows (e.g. Firebase Google) set cookies server-side without going through
 * `authClient.signIn.*`. Even email sign-in can leave the React atom briefly stale
 * across soft navigations — `$store.notify("$sessionSignal")` forces a refetch.
 */
export async function refreshClientAuthSession(): Promise<void> {
  try {
    await authClient.getSession({
      fetchOptions: {
        cache: "no-store",
      },
    });
  } catch {
    // Non-fatal — notify below still triggers useSession observers to refetch.
  }

  try {
    authClient.$store.notify("$sessionSignal");
  } catch {
    // Older client shapes — ignore.
  }

  // Give the session atom a brief tick to settle before dependents read it.
  await new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(() => resolve(), 0);
  });
}
