/** Client-safe notification types (API / UI). Keep in sync with db/schema/notifications. */

export const NOTIFICATION_TYPES = [
  "tournament_confirm_participation",
  "tournament_payment_reminder",
  "tournament_registration_confirmed",
  "tournament_host_player_paid",
  "tournament_host_player_confirmed",
  "tournament_host_payout_disbursed",
  "tournament_host_payout_failed",
  "tournament_payment_expired",
  "tournament_team_invite",
  "tournament_registration_cancelled",
  "host_role_request_submitted",
  "host_role_request_approved",
  "host_role_request_rejected",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationId = string;

/** Serialized notification row from API routes. */
export type NotificationItem = {
  id: NotificationId;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};
