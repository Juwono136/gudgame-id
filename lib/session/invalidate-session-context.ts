"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  fetchSessionContext,
  SESSION_CONTEXT_QUERY_KEY,
} from "@/lib/session/session-context";
import { refreshClientAuthSession } from "@/lib/session/refresh-client-auth-session";

export {
  fetchSessionContext,
  SESSION_CONTEXT_QUERY_KEY,
  type SessionContextData,
  type SessionContextUser,
  type SessionDashboardLink,
} from "@/lib/session/session-context";

/** Soft invalidate — active observers refetch when enabled. */
export function invalidateSessionContext(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: SESSION_CONTEXT_QUERY_KEY });
}

/**
 * After login/logout: sync Better Auth React session + force-populate session-context cache.
 * Uses fetchQuery so the cache updates even when no observer currently has the query enabled.
 */
export async function syncAuthSessionAfterChange(qc: QueryClient): Promise<void> {
  await refreshClientAuthSession();

  try {
    await qc.fetchQuery({
      queryKey: SESSION_CONTEXT_QUERY_KEY,
      queryFn: fetchSessionContext,
      staleTime: 0,
    });
  } catch {
    invalidateSessionContext(qc);
  }
}
