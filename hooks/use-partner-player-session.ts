"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emitPartnerPlayerAuthEvent,
  PARTNER_PLAYER_AUTH_EVENT,
  type PartnerPlayerAuthEventDetail,
} from "@/lib/partners/auth/client-events";

export type PartnerPlayerSessionClient = {
  identityId: string;
  partnerId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  playerId: string | null;
};

export function usePartnerPlayerSession(partnerSlug: string) {
  const [session, setSession] = useState<PartnerPlayerSessionClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/partner/public/${partnerSlug}/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setSession(null);
        return;
      }
      const json = await res.json();
      setSession(json.data?.session ?? null);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [partnerSlug]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void refresh();
  }, [hydrated, refresh]);

  useEffect(() => {
    if (!hydrated) return;

    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<PartnerPlayerAuthEventDetail>).detail;
      if (!detail || detail.partnerSlug !== partnerSlug) return;
      void refresh();
    };

    window.addEventListener(PARTNER_PLAYER_AUTH_EVENT, onLocal);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("gg-partner-player-auth");
      channel.onmessage = (msg) => {
        const data = msg.data as PartnerPlayerAuthEventDetail | undefined;
        if (!data || data.partnerSlug !== partnerSlug) return;
        void refresh();
      };
    } catch {
      channel = null;
    }

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener(PARTNER_PLAYER_AUTH_EVENT, onLocal);
      window.removeEventListener("focus", onFocus);
      channel?.close();
    };
  }, [hydrated, partnerSlug, refresh]);

  return {
    session,
    isAuthenticated: Boolean(session),
    isLoading: !hydrated || isLoading,
    hydrated,
    refresh,
    /** Notify other chrome that auth changed (prefer emitPartnerPlayerAuthEvent). */
    notifyAuthChange: (action: PartnerPlayerAuthEventDetail["action"]) =>
      emitPartnerPlayerAuthEvent(partnerSlug, action),
  };
}
