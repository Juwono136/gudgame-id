import { readNotificationEntityId } from "@/lib/notifications/metadata";
import type { NotificationItem } from "@/lib/notifications/types";

/** Turn stored absolute app URLs into in-app router paths. */
export function normalizeNotificationActionUrl(
  actionUrl: string | null | undefined,
  origin?: string,
): string | null {
  if (!actionUrl?.trim()) return null;
  const trimmed = actionUrl.trim();
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const url = new URL(trimmed, base);
    if (!origin && typeof window !== "undefined" && url.origin !== window.location.origin) {
      return trimmed;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Resolve navigation target when actionUrl is missing (legacy rows). */
export function resolveNotificationHref(
  item: Pick<NotificationItem, "type" | "actionUrl" | "metadata">,
  origin?: string,
): string | null {
  const direct = normalizeNotificationActionUrl(item.actionUrl, origin);
  if (direct) return direct;

  const meta = item.metadata ?? {};
  const tournamentId = readNotificationEntityId(meta.tournamentId);
  const registrationId = readNotificationEntityId(meta.registrationId);

  switch (item.type) {
    case "tournament_host_player_confirmed":
    case "tournament_host_player_paid":
      if (tournamentId) {
        return `/dashboard/host/payments?tournamentId=${tournamentId}`;
      }
      return "/dashboard/host/payments";
    case "tournament_host_payout_disbursed":
    case "tournament_host_payout_failed":
      return "/dashboard/host/payments";
    case "tournament_confirm_participation":
      if (registrationId && meta.sportSlug && meta.tournamentSlug) {
        return `/sports/${meta.sportSlug}/tournaments/${meta.tournamentSlug}/register/confirm?registrationId=${registrationId}`;
      }
      return registrationId ? `/dashboard` : null;
    case "tournament_payment_reminder":
    case "tournament_registration_confirmed":
      if (registrationId && meta.sportSlug && meta.tournamentSlug) {
        return `/sports/${meta.sportSlug}/tournaments/${meta.tournamentSlug}/register/checkout?registrationId=${registrationId}`;
      }
      return null;
    case "tournament_payment_expired":
    case "tournament_registration_cancelled":
    case "tournament_team_invite":
      if (meta.sportSlug && meta.tournamentSlug) {
        return `/sports/${meta.sportSlug}/tournaments/${meta.tournamentSlug}`;
      }
      if (tournamentId) {
        return `/dashboard/host/tournaments/${tournamentId}`;
      }
      return null;
    default:
      return null;
  }
}
