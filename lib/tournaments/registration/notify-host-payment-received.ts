import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import { dashboardRoutes } from "@/lib/constants/routes";
import { siteConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications/service";
import {
  tournamentNotificationMetadata,
  tournamentNotificationTitle,
} from "@/lib/notifications/tournament-label";

const log = logger.child({ module: "host-payment-received" });

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function formatIdr(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function formatPaidAt(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(date);
}

function resolveInvoiceNumber(paymentId: string, xenditExternalId: string | null): string {
  return xenditExternalId?.trim() || `TB-PAY-${String(paymentId).padStart(6, "0")}`;
}

function displayName(row: { fullNameKtp: string | null; name: string | null }, fallback: string): string {
  return row.fullNameKtp?.trim() || row.name?.trim() || fallback;
}

type HostPaymentContext = {
  registrationId: string;
  tournamentId: string;
  hostUserId: string;
  hostName: string;
  hostEmail: string | null;
  playerUserId: string;
  playerName: string;
  playerEmail: string | null;
  tournamentName: string;
  teamName: string;
  sportName: string;
  paymentId: string;
  amountIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  invoiceNumber: string;
  paidAtFormatted: string | null;
  receiptUrl: string;
  ledgerUrl: string;
  tournamentWorkspaceUrl: string;
};

import { isUuid } from "@/lib/domain/uuid";

async function loadHostPaymentContext(registrationId: string): Promise<HostPaymentContext | null> {
  if (!isUuid(registrationId)) {
    log.warn("Invalid registration id for host payment notify", { registrationId });
    return null;
  }

  const [row] = await getDb()
    .select({
      registrationId: tournamentRegistrations.id,
      registeredByUserId: tournamentRegistrations.registeredByUserId,
      teamName: tournamentTeams.name,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      sportName: sports.name,
      partnerId: tournaments.partnerId,
      hostUserId: tournaments.createdBy,
      paymentId: tournamentPayments.id,
      paymentStatus: tournamentPayments.status,
      amountIdr: tournamentPayments.amountIdr,
      platformFeeIdr: tournamentPayments.platformFeeIdr,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      paidAt: tournamentPayments.paidAt,
      xenditExternalId: tournamentPayments.xenditExternalId,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(eq(tournamentRegistrations.id, registrationId))
    .limit(1);

  if (!row) {
    log.warn("Registration not found for host payment notify", { registrationId });
    return null;
  }

  if (row.paymentStatus !== "paid" || !row.paymentId) {
    log.warn("Skipping host payment notify — payment not ready", {
      registrationId,
      paymentStatus: row.paymentStatus,
      paymentId: row.paymentId,
    });
    return null;
  }

  if (!row.hostUserId) {
    log.warn("Tournament host not found", { registrationId, tournamentId: row.tournamentId });
    return null;
  }

  if (row.hostUserId === row.registeredByUserId) {
    return null;
  }

  const [hostRow] = await getDb()
    .select({ email: user.email, name: user.name, fullNameKtp: user.fullNameKtp })
    .from(user)
    .where(eq(user.id, row.hostUserId))
    .limit(1);

  const [playerRow] = await getDb()
    .select({ email: user.email, name: user.name, fullNameKtp: user.fullNameKtp })
    .from(user)
    .where(eq(user.id, row.registeredByUserId))
    .limit(1);

  const origin = appBaseUrl();
  const isPartner = Boolean(row.partnerId);
  const ledgerPath = isPartner
    ? `${dashboardRoutes.partnerTournaments}?registrationId=${registrationId}`
    : `${dashboardRoutes.hostPayments}?registrationId=${registrationId}`;
  const workspacePath = isPartner
    ? dashboardRoutes.partnerTournaments
    : dashboardRoutes.hostTournament(row.tournamentId);

  return {
    registrationId,
    tournamentId: row.tournamentId,
    hostUserId: row.hostUserId,
    hostName: displayName(hostRow ?? { fullNameKtp: null, name: null }, isPartner ? "Partner" : "Host"),
    hostEmail: hostRow?.email ?? null,
    playerUserId: row.registeredByUserId,
    playerName: displayName(playerRow ?? { fullNameKtp: null, name: null }, "Player"),
    playerEmail: playerRow?.email ?? null,
    tournamentName: row.tournamentName,
    teamName: row.teamName ?? "Team",
    sportName: row.sportName ?? "Tournament",
    paymentId: row.paymentId,
    amountIdr: row.amountIdr ?? 0,
    platformFeeIdr: row.platformFeeIdr ?? 0,
    hostPayoutIdr: row.hostPayoutIdr ?? 0,
    invoiceNumber: resolveInvoiceNumber(row.paymentId, row.xenditExternalId),
    paidAtFormatted: formatPaidAt(row.paidAt),
    receiptUrl: `${origin}${dashboardRoutes.paymentReceipt(row.paymentId)}`,
    ledgerUrl: `${origin}${ledgerPath}`,
    tournamentWorkspaceUrl: `${origin}${workspacePath}`,
  };
}

async function sendHostInAppNotification(ctx: HostPaymentContext): Promise<void> {
  const amountCollected = formatIdr(ctx.amountIdr);
  const hostPayout = formatIdr(ctx.hostPayoutIdr);

  await createNotification({
    userId: ctx.hostUserId,
    type: "tournament_host_player_paid",
    title: tournamentNotificationTitle(
      ctx.sportName,
      ctx.tournamentName,
      "Payment received",
    ),
    body: `[${ctx.sportName}] ${ctx.playerName} paid ${amountCollected} for "${ctx.teamName}". Your payout: ${hostPayout}. Tap to view the official receipt.`,
    actionUrl: ctx.receiptUrl,
    metadata: tournamentNotificationMetadata(
      { id: ctx.tournamentId, sportName: ctx.sportName },
      {
        registrationId: ctx.registrationId,
        paymentId: ctx.paymentId,
        amountIdr: ctx.amountIdr,
        hostPayoutIdr: ctx.hostPayoutIdr,
        platformFeeIdr: ctx.platformFeeIdr,
        invoiceNumber: ctx.invoiceNumber,
      },
    ),
  });
}

function sendHostPaymentEmail(ctx: HostPaymentContext): void {
  if (!ctx.hostEmail) {
    log.info("Host has no email — in-app notification only", {
      registrationId: ctx.registrationId,
      hostUserId: ctx.hostUserId,
    });
    return;
  }

  sendTemplatedEmailInBackground(
    {
      to: ctx.hostEmail,
      template: "host-payment-received",
      data: {
        appName: siteConfig.name,
        hostName: ctx.hostName,
        playerName: ctx.playerName,
        playerEmail: ctx.playerEmail,
        tournamentName: ctx.tournamentName,
        teamName: ctx.teamName,
        sportName: ctx.sportName,
        amountCollectedFormatted: formatIdr(ctx.amountIdr),
        platformFeeFormatted: formatIdr(ctx.platformFeeIdr),
        hostPayoutFormatted: formatIdr(ctx.hostPayoutIdr),
        invoiceNumber: ctx.invoiceNumber,
        paidAtFormatted: ctx.paidAtFormatted,
        receiptUrl: ctx.receiptUrl,
        ledgerUrl: ctx.ledgerUrl,
        tournamentWorkspaceUrl: ctx.tournamentWorkspaceUrl,
      },
    },
    { module: "host-payment-received" },
  );
}

/** Notify tournament host (in-app + email) when a player payment is confirmed. */
export async function notifyHostPaymentReceived(registrationId: string): Promise<void> {
  try {
    const ctx = await loadHostPaymentContext(registrationId);
    if (!ctx) return;

    await sendHostInAppNotification(ctx);
    sendHostPaymentEmail(ctx);

    log.info("Host payment notification sent", {
      registrationId,
      paymentId: ctx.paymentId,
      hostUserId: ctx.hostUserId,
    });
  } catch (error) {
    log.error("Host payment notification failed", {
      registrationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** @deprecated Use notifyHostPaymentReceived — kept for existing imports. */
export const notifyHostPlayerPaid = notifyHostPaymentReceived;
