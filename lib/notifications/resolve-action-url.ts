import { dashboardRoutes } from "@/lib/constants/routes";
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
  // Always land on Settings → Roles (where the request was made). Avoid linking
  // straight to /dashboard/host: partner users without a fresh Host session were
  // redirected to Partner via getDefaultDashboardUrl.
  if (
    item.type === "host_role_request_approved" ||
    item.type === "host_role_request_rejected"
  ) {
    return `${dashboardRoutes.settings}#roles`;
  }

  const direct = normalizeNotificationActionUrl(item.actionUrl, origin);
  if (direct) return direct;

  const meta = item.metadata ?? {};
  const tournamentId = readNotificationEntityId(meta.tournamentId);
  const registrationId = readNotificationEntityId(meta.registrationId);
  const partnerSlug =
    typeof meta.partnerSlug === "string" && meta.partnerSlug.trim()
      ? meta.partnerSlug.trim()
      : null;
  const sportSlug =
    typeof meta.sportSlug === "string" && meta.sportSlug.trim() ? meta.sportSlug.trim() : null;
  const tournamentSlug =
    typeof meta.tournamentSlug === "string" && meta.tournamentSlug.trim()
      ? meta.tournamentSlug.trim()
      : null;

  const tournamentHub =
    partnerSlug && tournamentSlug
      ? `/${partnerSlug}/tournaments/${tournamentSlug}`
      : sportSlug && tournamentSlug
        ? `/sports/${sportSlug}/tournaments/${tournamentSlug}`
        : null;

  switch (item.type) {
    case "tournament_host_player_confirmed":
    case "tournament_host_player_paid":
      if (partnerSlug) {
        return tournamentId
          ? `/dashboard/partner/tournaments?tournamentId=${tournamentId}`
          : "/dashboard/partner/tournaments";
      }
      if (tournamentId) {
        return `/dashboard/host/payments?tournamentId=${tournamentId}`;
      }
      return "/dashboard/host/payments";
    case "tournament_host_payout_disbursed":
    case "tournament_host_payout_failed":
      return partnerSlug ? "/dashboard/partner/tournaments" : "/dashboard/host/payments";
    case "tournament_confirm_participation":
      if (registrationId && tournamentHub) {
        return `${tournamentHub}/register/confirm?registrationId=${registrationId}`;
      }
      return registrationId ? `/dashboard` : null;
    case "tournament_payment_reminder":
    case "tournament_registration_confirmed":
      if (registrationId && tournamentHub) {
        return `${tournamentHub}/register/checkout?registrationId=${registrationId}`;
      }
      return null;
    case "tournament_payment_expired":
    case "tournament_registration_cancelled":
    case "tournament_team_invite":
      if (tournamentHub) return tournamentHub;
      if (tournamentId) {
        return `/dashboard/host/tournaments/${tournamentId}`;
      }
      return null;
    default:
      return null;
  }
}
