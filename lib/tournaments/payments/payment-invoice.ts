import "server-only";

import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers, partnerTournamentRegistrations } from "@/db/schema/partner-players";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { siteConfig } from "@/lib/config";
import { isUuid } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";
import type { AppRole } from "@/lib/roles/constants";
import {
  canAccessAdminConsole,
  canAccessHostDashboard,
  canAccessPartnerDashboard,
} from "@/lib/roles/route-access";

export type PaymentInvoiceViewerRole = "player" | "host" | "admin" | "partner" | "guest";

export type PaymentInvoiceLineItem = {
  label: string;
  amountIdr: number;
};

export type PaymentInvoiceDocument = {
  invoiceNumber: string;
  paymentId: string;
  registrationId: string;
  status: "paid";
  paidAt: string;
  issuedAt: string;
  paymentMethod: string | null;
  viewerRole: PaymentInvoiceViewerRole;
  payer: {
    name: string;
    email: string;
  };
  teamName: string | null;
  tournament: {
    id: string; name: string;
    sportSlug: string;
    slug: string;
    type: string;
    startsAt: string | null;
    endsAt: string | null;
  };
  host: {
    name: string;
    email: string | null;
  };
  lineItems: PaymentInvoiceLineItem[];
  registrationFeeIdr: number;
  processingFeeIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  totalIdr: number;
  issuer: {
    name: string;
    description: string;
  };
};

const hostUser = alias(user, "invoice_host_user");
/** Captain of a partner guest registration — stands in for the payer when there's no Gud Game user. */
const captainPlayer = alias(partnerPlayers, "invoice_captain_player");

function formatPaymentMethod(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type InvoiceRow = {
  paymentId: string;
  registrationId: string | null;
  partnerRegistrationId: string | null;
  status: string;
  amountIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  processingFeeIdr: number;
  xenditExternalId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  metadata: unknown;
  payerUserId: string | null;
  payerName: string | null;
  payerEmail: string | null;
  teamName: string | null;
  partnerTeamName: string | null;
  captainName: string | null;
  captainEmail: string | null;
  tournamentId: string;
  tournamentName: string;
  tournamentType: string;
  tournamentSlug: string;
  tournamentPartnerId: string | null;
  sportSlug: string;
  startsAt: Date | null;
  endsAt: Date | null;
  hostUserId: string | null;
  hostName: string | null;
  hostEmail: string | null;
};

async function fetchInvoiceRow(paymentId: string): Promise<InvoiceRow | null> {
  if (!isUuid(paymentId)) {
    throw new AppError("Invalid payment id", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  const [row] = await getDb()
    .select({
      paymentId: tournamentPayments.id,
      registrationId: tournamentPayments.registrationId,
      partnerRegistrationId: tournamentPayments.partnerRegistrationId,
      status: tournamentPayments.status,
      amountIdr: tournamentPayments.amountIdr,
      platformFeeIdr: tournamentPayments.platformFeeIdr,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      processingFeeIdr: tournamentPayments.processingFeeIdr,
      xenditExternalId: tournamentPayments.xenditExternalId,
      paidAt: tournamentPayments.paidAt,
      createdAt: tournamentPayments.createdAt,
      metadata: tournamentPayments.metadata,
      payerUserId: tournamentPayments.payerUserId,
      payerName: user.name,
      payerEmail: user.email,
      teamName: tournamentTeams.name,
      partnerTeamName: partnerTournamentRegistrations.teamName,
      captainName: captainPlayer.fullName,
      captainEmail: captainPlayer.email,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentType: tournaments.tournamentType,
      tournamentSlug: tournaments.slug,
      tournamentPartnerId: tournaments.partnerId,
      sportSlug: sports.slug,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      hostUserId: tournaments.createdBy,
      hostName: hostUser.name,
      hostEmail: hostUser.email,
    })
    .from(tournamentPayments)
    .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(user, eq(tournamentPayments.payerUserId, user.id))
    .leftJoin(
      tournamentRegistrations,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .leftJoin(
      partnerTournamentRegistrations,
      eq(tournamentPayments.partnerRegistrationId, partnerTournamentRegistrations.id),
    )
    .leftJoin(
      captainPlayer,
      eq(partnerTournamentRegistrations.captainPartnerPlayerId, captainPlayer.id),
    )
    .leftJoin(hostUser, eq(tournaments.createdBy, hostUser.id))
    .where(eq(tournamentPayments.id, paymentId))
    .limit(1);

  return row ?? null;
}

function buildInvoiceDocument(
  row: InvoiceRow,
  viewerRole: PaymentInvoiceViewerRole,
): PaymentInvoiceDocument {
  if (row.status !== "paid") {
    throw new AppError("Invoice is available only for completed payments", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  if (!row.paidAt) {
    throw new AppError("Payment receipt is not ready yet", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const registrationFeeIdr = Math.max(0, row.amountIdr - row.processingFeeIdr);

  const lineItems: PaymentInvoiceLineItem[] = [
    { label: "Tournament registration fee", amountIdr: registrationFeeIdr },
  ];
  if (row.processingFeeIdr > 0) {
    lineItems.push({ label: "Payment processing fee", amountIdr: row.processingFeeIdr });
  }

  const invoiceNumber =
    row.xenditExternalId?.trim() ||
    `TB-PAY-${String(row.paymentId).padStart(6, "0")}`;

  return {
    invoiceNumber,
    paymentId: row.paymentId,
    registrationId: row.registrationId ?? row.partnerRegistrationId ?? "",
    status: "paid",
    paidAt: row.paidAt.toISOString(),
    issuedAt: row.paidAt.toISOString(),
    paymentMethod: formatPaymentMethod(
      typeof meta.paymentMethod === "string" ? meta.paymentMethod : null,
    ),
    viewerRole,
    payer: {
      name: row.payerName?.trim() || row.captainName?.trim() || "Player",
      email: row.payerEmail ?? row.captainEmail ?? "",
    },
    teamName: row.teamName ?? row.partnerTeamName ?? null,
    tournament: {
      id: row.tournamentId,
      name: row.tournamentName,
      sportSlug: row.sportSlug,
      slug: row.tournamentSlug,
      type: row.tournamentType,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
    },
    host: {
      name: row.hostName?.trim() || "Tournament host",
      email: row.hostEmail,
    },
    lineItems,
    registrationFeeIdr,
    processingFeeIdr: row.processingFeeIdr,
    platformFeeIdr: row.platformFeeIdr,
    hostPayoutIdr: row.hostPayoutIdr,
    totalIdr: row.amountIdr,
    issuer: {
      name: siteConfig.name,
      description: siteConfig.description,
    },
  };
}

async function resolveViewerRole(
  row: InvoiceRow,
  userId: string,
  roles: AppRole[],
): Promise<PaymentInvoiceViewerRole | null> {
  if (row.payerUserId && row.payerUserId === userId) return "player";
  if (row.hostUserId === userId && canAccessHostDashboard(roles)) return "host";
  if (row.tournamentPartnerId && canAccessPartnerDashboard(roles)) {
    const partner = await getPrimaryPartnerForUser(userId);
    if (partner && partner.id === row.tournamentPartnerId) return "partner";
  }
  if (canAccessAdminConsole(roles)) return "admin";
  return null;
}

/** Dashboard access (player, host, partner, admin) — resolves the viewer's relationship to the payment. */
export async function getPaymentInvoiceDocument(
  paymentId: string,
  userId: string,
  roles: AppRole[],
): Promise<PaymentInvoiceDocument> {
  const row = await fetchInvoiceRow(paymentId);
  if (!row) {
    throw new AppError("Payment not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const viewerRole = await resolveViewerRole(row, userId, roles);
  if (!viewerRole) {
    throw new AppError("You do not have access to this invoice", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  return buildInvoiceDocument(row, viewerRole);
}

/** Partner dashboard receipt page — ownership is scoped to the partner's tenant, not a specific user. */
export async function getPartnerPaymentInvoiceDocument(
  paymentId: string,
  partnerId: string,
): Promise<PaymentInvoiceDocument> {
  const row = await fetchInvoiceRow(paymentId);
  if (!row || row.tournamentPartnerId !== partnerId) {
    throw new AppError("Payment not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  return buildInvoiceDocument(row, "partner");
}

/**
 * Guest (no Gud Game login) receipt access — ownership is proven by an already-verified
 * partner registration access token, matched against the payment's `partnerRegistrationId`.
 */
export async function getGuestPaymentInvoiceDocument(
  paymentId: string,
  partnerRegistrationId: string,
): Promise<PaymentInvoiceDocument> {
  const row = await fetchInvoiceRow(paymentId);
  if (!row || row.partnerRegistrationId !== partnerRegistrationId) {
    throw new AppError("Payment not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  return buildInvoiceDocument(row, "guest");
}
