import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { sendTemplatedEmail } from "@/lib/email/send";
import { siteConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications/service";
import {
  tournamentNotificationMetadata,
  tournamentNotificationTitle,
} from "@/lib/notifications/tournament-label";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getRegistrationDetail } from "@/lib/tournaments/registration/service";

const log = logger.child({ module: "registration-notify" });

export const PAYMENT_WINDOW_HOURS = 48;

export function getPaymentDueDate(): Date {
  return new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function tournamentPublicUrl(tournament: Pick<TournamentDetail, "sportSlug" | "slug">): string {
  return `${appBaseUrl()}/sports/${tournament.sportSlug}/tournaments/${tournament.slug}`;
}

export function confirmUrl(tournament: Pick<TournamentDetail, "sportSlug" | "slug">, registrationId: string): string {
  return `${tournamentPublicUrl(tournament)}/register/confirm?registrationId=${registrationId}`;
}

export function checkoutUrl(tournament: Pick<TournamentDetail, "sportSlug" | "slug">, registrationId: string): string {
  return `${tournamentPublicUrl(tournament)}/register/checkout?registrationId=${registrationId}`;
}

async function loadUserDisplay(userId: string) {
  const [row] = await getDb()
    .select({ email: user.email, name: user.name, fullNameKtp: user.fullNameKtp })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return {
    email: row?.email ?? null,
    displayName: row?.fullNameKtp ?? row?.name ?? "Player",
  };
}

export async function notifyAwaitingConfirmation(
  tournament: TournamentDetail,
  registrationId: string,
  payerUserId: string,
  teamName: string,
): Promise<void> {
  const actionUrl = confirmUrl(tournament, registrationId);
  const { email, displayName } = await loadUserDisplay(payerUserId);

  await createNotification({
    userId: payerUserId,
    type: "tournament_confirm_participation",
    title: tournamentNotificationTitle(
      tournament.sportName,
      tournament.name,
      "You're registered",
    ),
    body: `[${tournament.sportName}] Team "${teamName}" joined successfully. Confirm participation in the app within ${PAYMENT_WINDOW_HOURS}h to unlock payment.`,
    actionUrl,
    metadata: tournamentNotificationMetadata(tournament, { registrationId, teamName }),
  });

  if (email) {
    void sendTemplatedEmail({
      to: email,
      template: "registration-confirm-participation",
      data: {
        userName: displayName,
        appName: siteConfig.name,
        tournamentName: tournament.name,
        teamName,
        sportName: tournament.sportName,
        confirmUrl: actionUrl,
        tournamentUrl: tournamentPublicUrl(tournament),
        deadlineHours: PAYMENT_WINDOW_HOURS,
      },
    }).then((result) => {
      if (!result.ok) {
        log.warn("Registration joined email failed", { registrationId, error: result.error });
      }
    });
  }

  if (tournament.createdBy && tournament.createdBy !== payerUserId) {
    await createNotification({
      userId: tournament.createdBy,
      type: "tournament_host_player_confirmed",
      title: tournamentNotificationTitle(
        tournament.sportName,
        tournament.name,
        "New registration",
      ),
      body: `${displayName} registered team "${teamName}" for ${tournament.sportName}. Awaiting in-app confirmation.`,
      actionUrl: `${appBaseUrl()}/dashboard/host/tournaments/${tournament.id}`,
      metadata: tournamentNotificationMetadata(tournament, { registrationId }),
    });
  }
}

export async function notifyPaymentReminder(
  tournament: TournamentDetail,
  registrationId: string,
  payerUserId: string,
  teamName: string,
  amountIdr: number,
): Promise<void> {
  const actionUrl = checkoutUrl(tournament, registrationId);
  const { email, displayName } = await loadUserDisplay(payerUserId);
  const fee = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amountIdr);

  await createNotification({
    userId: payerUserId,
    type: "tournament_payment_reminder",
    title: tournamentNotificationTitle(
      tournament.sportName,
      tournament.name,
      "Complete payment",
    ),
    body: `[${tournament.sportName}] Team "${teamName}" is confirmed. Pay ${fee} to secure your slot.`,
    actionUrl,
    metadata: tournamentNotificationMetadata(tournament, { registrationId, amountIdr }),
  });

  if (email) {
    void sendTemplatedEmail({
      to: email,
      template: "registration-payment-reminder",
      data: {
        userName: displayName,
        appName: siteConfig.name,
        tournamentName: tournament.name,
        teamName,
        sportName: tournament.sportName,
        amountFormatted: fee,
        checkoutUrl: actionUrl,
        tournamentUrl: tournamentPublicUrl(tournament),
        paymentDeadlineHours: PAYMENT_WINDOW_HOURS,
      },
    }).then((result) => {
      if (!result.ok) {
        log.warn("Payment reminder email failed", { registrationId, error: result.error });
      }
    });
  }
}

export async function notifyHostPlayerConfirmedParticipation(
  tournament: TournamentDetail,
  registrationId: string,
  playerUserId: string,
  teamName: string,
): Promise<void> {
  if (!tournament.createdBy || tournament.createdBy === playerUserId) return;

  const { displayName } = await loadUserDisplay(playerUserId);
  await createNotification({
    userId: tournament.createdBy,
    type: "tournament_host_player_confirmed",
    title: tournamentNotificationTitle(
      tournament.sportName,
      tournament.name,
      "Player confirmed",
    ),
    body: `${displayName} confirmed team "${teamName}" for ${tournament.sportName} and can now complete payment.`,
    actionUrl: `${appBaseUrl()}/dashboard/host/payments?tournamentId=${tournament.id}`,
    metadata: tournamentNotificationMetadata(tournament, { registrationId }),
  });
}

export async function notifyPlayerRegistrationConfirmed(
  registrationId: string,
  payerUserId: string,
  tournamentName: string,
  actionUrl: string,
  sportName?: string,
): Promise<void> {
  const sport = sportName?.trim() || "Tournament";
  await createNotification({
    userId: payerUserId,
    type: "tournament_registration_confirmed",
    title: tournamentNotificationTitle(sport, tournamentName, "You're in"),
    body: `[${sport}] Payment received. Your official receipt is ready — tap to view or download.`,
    actionUrl,
    metadata: {
      registrationId,
      ...(sportName ? { sportName } : {}),
    },
  });
}

export async function notifyPaymentFailed(registrationId: string): Promise<void> {
  const detail = await getRegistrationDetail(registrationId);
  if (!detail) return;

  const actionUrl = `${appBaseUrl()}/sports/${detail.sportSlug}/tournaments/${detail.tournamentSlug}/register/checkout?registrationId=${registrationId}`;

  await createNotification({
    userId: detail.registeredByUserId,
    type: "tournament_payment_reminder",
    title: tournamentNotificationTitle(
      detail.sportName ?? "Tournament",
      detail.tournamentName,
      "Payment not completed",
    ),
    body: `[${detail.sportName ?? "Tournament"}] Payment for team "${detail.teamName ?? "your team"}" was not completed. You can try again before the deadline.`,
    actionUrl,
    metadata: {
      registrationId,
      reason: "failed",
      sportSlug: detail.sportSlug,
      sportName: detail.sportName,
      tournamentId: detail.tournamentId,
    },
  });
}

export async function notifyPaymentExpired(registrationId: string): Promise<void> {
  const detail = await getRegistrationDetail(registrationId);
  if (!detail) return;

  const actionUrl = `${appBaseUrl()}/sports/${detail.sportSlug}/tournaments/${detail.tournamentSlug}`;
  const reason = "The payment deadline passed and your reserved slot was released.";

  await createNotification({
    userId: detail.registeredByUserId,
    type: "tournament_payment_expired",
    title: tournamentNotificationTitle(
      detail.sportName ?? "Tournament",
      detail.tournamentName,
      "Payment window closed",
    ),
    body: `[${detail.sportName ?? "Tournament"}] The payment deadline for team "${detail.teamName ?? "your team"}" has passed. Your slot has been released.`,
    actionUrl,
    metadata: {
      registrationId,
      sportSlug: detail.sportSlug,
      sportName: detail.sportName,
      tournamentId: detail.tournamentId,
    },
  });

  const { email, displayName } = await loadUserDisplay(detail.registeredByUserId);
  if (email) {
    void sendTemplatedEmail({
      to: email,
      template: "registration-cancelled",
      data: {
        userName: displayName,
        appName: siteConfig.name,
        tournamentName: detail.tournamentName,
        teamName: detail.teamName ?? "Team",
        sportName: detail.sportName ?? "Tournament",
        tournamentUrl: actionUrl,
        reason,
        canReRegister: true,
      },
    }).then((result) => {
      if (!result.ok) {
        log.warn("Payment expired email failed", { registrationId, error: result.error });
      }
    });
  }
}

export async function notifyTeamMemberInvitations(
  tournament: TournamentDetail,
  registrationId: string,
  captainUserId: string,
  teamName: string,
  memberUserIds: string[],
): Promise<void> {
  const invitees = memberUserIds.filter((id) => id !== captainUserId);
  if (!invitees.length) return;

  const { displayName: captainName } = await loadUserDisplay(captainUserId);
  const tournamentUrl = tournamentPublicUrl(tournament);

  for (const memberId of invitees) {
    const { email, displayName } = await loadUserDisplay(memberId);
    await createNotification({
      userId: memberId,
      type: "tournament_team_invite",
      title: tournamentNotificationTitle(
        tournament.sportName,
        tournament.name,
        "Team invitation",
      ),
      body: `${captainName} added you to team "${teamName}" for ${tournament.sportName} · ${tournament.name}.`,
      actionUrl: tournamentUrl,
      metadata: tournamentNotificationMetadata(tournament, {
        registrationId,
        teamName,
        captainUserId,
      }),
    });

    if (email) {
      void sendTemplatedEmail({
        to: email,
        template: "registration-team-invite",
        data: {
          userName: displayName,
          appName: siteConfig.name,
          captainName,
          tournamentName: tournament.name,
          teamName,
          sportName: tournament.sportName,
          tournamentUrl,
        },
      }).then((result) => {
        if (!result.ok) {
          log.warn("Team invite email failed", { memberId, registrationId, error: result.error });
        }
      });
    }
  }
}

export async function notifyRegistrationCancelled(
  tournament: TournamentDetail,
  registrationId: string,
  userId: string,
  teamName: string,
  reason: string,
  canReRegister = true,
): Promise<void> {
  const { email, displayName } = await loadUserDisplay(userId);
  const tournamentUrl = tournamentPublicUrl(tournament);

  await createNotification({
    userId,
    type: "tournament_registration_cancelled",
    title: tournamentNotificationTitle(
      tournament.sportName,
      tournament.name,
      "Registration cancelled",
    ),
    body: `[${tournament.sportName}] Your registration for team "${teamName}" was cancelled. ${reason}`,
    actionUrl: tournamentUrl,
    metadata: tournamentNotificationMetadata(tournament, { registrationId, teamName }),
  });

  if (email) {
    void sendTemplatedEmail({
      to: email,
      template: "registration-cancelled",
      data: {
        userName: displayName,
        appName: siteConfig.name,
        tournamentName: tournament.name,
        teamName,
        sportName: tournament.sportName,
        tournamentUrl,
        reason,
        canReRegister,
      },
    }).then((result) => {
      if (!result.ok) {
        log.warn("Registration cancelled email failed", { registrationId, error: result.error });
      }
    });
  }
}

export { notifyHostPaymentReceived, notifyHostPlayerPaid } from "./notify-host-payment-received";
