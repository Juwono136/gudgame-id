"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/auth/client";
import {
  useSessionContext,
  type SessionContextUser,
} from "@/hooks/use-session-context";

export type AuthUser = SessionContextUser;

/**
 * Unified auth user from Better Auth session + session-context API.
 * Prefer session-context for profile fields (image/name/nickname) so Settings
 * updates show immediately without a full page reload.
 */
export function useAuthUser() {
  const { data: session, isPending: sessionPending } = useSession();
  const hasAuthSession = Boolean(session?.user);
  const { data: sessionCtx, isPending: ctxPending } = useSessionContext(
    sessionPending || hasAuthSession,
  );

  const user = useMemo((): AuthUser | null => {
    const ba = session?.user;
    const ctx = sessionCtx?.user;

    if (ba?.id) {
      return {
        id: ba.id,
        email: ba.email ?? ctx?.email ?? "",
        name: ctx?.name?.trim() || ba.name || "",
        image: ctx ? (ctx.image ?? null) : (ba.image ?? null),
        nickname: ctx?.nickname ?? (ba as AuthUser).nickname ?? null,
        role: ctx?.role ?? (ba as AuthUser).role ?? null,
      };
    }

    return ctx ?? null;
  }, [session?.user, sessionCtx?.user]);

  const isAuthenticated =
    Boolean(user) || sessionCtx?.authenticated === true;

  const isAuthLoading =
    (sessionPending || ctxPending) &&
    !user &&
    sessionCtx?.authenticated !== true;

  return {
    user,
    session,
    sessionCtx,
    isAuthenticated,
    isAuthLoading,
  };
}

export function getAuthDisplayFirstName(user: AuthUser | null): string {
  if (!user) return "there";
  const fromNickname = user.nickname?.trim();
  if (fromNickname) return fromNickname;
  const fromName = user.name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = user.email?.split("@")[0]?.trim();
  if (fromEmail) return fromEmail;
  return "there";
}
