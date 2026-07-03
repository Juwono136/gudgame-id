"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/auth/client";
import {
  useSessionContext,
  type SessionContextUser,
} from "@/hooks/use-session-context";

export type AuthUser = SessionContextUser;

function mapSessionUser(
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    nickname?: string | null;
    role?: string | null;
  },
  fallbackNickname?: string | null,
): AuthUser {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    image: user.image ?? null,
    nickname: user.nickname ?? fallbackNickname ?? null,
    role: user.role ?? null,
  };
}

/**
 * Unified auth user from Better Auth session + session-context API.
 * Handles stale useSession() cache after Firebase Google login.
 */
export function useAuthUser() {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: sessionCtx, isPending: ctxPending } = useSessionContext();

  const user = useMemo((): AuthUser | null => {
    if (session?.user?.id) {
      return mapSessionUser(
        session.user as AuthUser,
        sessionCtx?.user?.nickname,
      );
    }
    return sessionCtx?.user ?? null;
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
