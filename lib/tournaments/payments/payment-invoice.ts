import "server-only";

import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { siteConfig } from "@/lib/config";
import { isUuid } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import type { AppRole } from "@/lib/roles/constants";
import { canAccessAdminConsole, canAccessHostDashboard } from "@/lib/roles/route-access";

export type PaymentInvoiceViewerRole = "player" | "host" | "admin";

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

function resolveViewerRole(
  payerUserId: string,
  hostUserId: string | null,
  userId: string,
  roles: AppRole[],
): PaymentInvoiceViewerRole | null {
  if (payerUserId === userId) return "player";
  if (hostUserId === userId && canAccessHostDashboard(roles)) return "host";
  if (canAccessAdminConsole(roles)) return "admin";
  return null;
}

const hostUser = alias(user, "invoice_host_user");

function formatPaymentMethod(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getPaymentInvoiceDocument(
  paymentId: string,
  userId: string,
  roles: AppRole[],
): Promise<PaymentInvoiceDocument> {
  if (!isUuid(paymentId)) {
    throw new AppError("Invalid payment id", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  const [row] = await getDb()
    .select({
      paymentId: tournamentPayments.id,
      registrationId: tournamentPayments.registrationId,
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
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentType: tournaments.tournamentType,
      tournamentSlug: tournaments.slug,
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
    .innerJoin(user, eq(tournamentPayments.payerUserId, user.id))
    .leftJoin(
      tournamentRegistrations,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .leftJoin(hostUser, eq(tournaments.createdBy, hostUser.id))
    .where(eq(tournamentPayments.id, paymentId))
    .limit(1);

  if (!row) {
    throw new AppError("Payment not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const viewerRole = resolveViewerRole(row.payerUserId, row.hostUserId, userId, roles);
  if (!viewerRole) {
    throw new AppError("You do not have access to this invoice", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

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
  const registrationFeeIdr = Math.max(
    0,
    row.amountIdr - row.processingFeeIdr,
  );

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
    registrationId: row.registrationId,
    status: "paid",
    paidAt: row.paidAt.toISOString(),
    issuedAt: row.paidAt.toISOString(),
    paymentMethod: formatPaymentMethod(
      typeof meta.paymentMethod === "string" ? meta.paymentMethod : null,
    ),
    viewerRole,
    payer: {
      name: row.payerName?.trim() || "Player",
      email: row.payerEmail,
    },
    teamName: row.teamName,
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
