"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchSessionContext,
  SESSION_CONTEXT_QUERY_KEY,
  type SessionContextData,
  type SessionContextUser,
  type SessionDashboardLink,
} from "@/lib/session/session-context";

export type {
  SessionContextData,
  SessionContextUser,
  SessionDashboardLink,
};

/**
 * App session enrichment (roles, profile image, dashboards).
 * Always enabled so post-login soft navigations can read a populated cache even when
 * Better Auth `useSession()` has not flipped to authenticated yet.
 */
export function useSessionContext(enabled = true) {
  return useQuery({
    queryKey: SESSION_CONTEXT_QUERY_KEY,
    queryFn: fetchSessionContext,
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}
