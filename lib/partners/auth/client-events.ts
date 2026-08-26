/** Browser event so partner chrome refreshes session without full remount. */
export const PARTNER_PLAYER_AUTH_EVENT = "gg:partner-player-auth";

export type PartnerPlayerAuthEventDetail = {
  partnerSlug: string;
  action: "login" | "logout" | "verify" | "refresh";
};

export function emitPartnerPlayerAuthEvent(
  partnerSlug: string,
  action: PartnerPlayerAuthEventDetail["action"],
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PartnerPlayerAuthEventDetail>(PARTNER_PLAYER_AUTH_EVENT, {
      detail: { partnerSlug, action },
    }),
  );
  try {
    const channel = new BroadcastChannel("gg-partner-player-auth");
    channel.postMessage({ partnerSlug, action } satisfies PartnerPlayerAuthEventDetail);
    channel.close();
  } catch {
    // BroadcastChannel unavailable — CustomEvent is enough for same tab.
  }
}
