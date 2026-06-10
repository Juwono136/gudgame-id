import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { isXenditConfigured } from "@/lib/payments/xendit";
import { createRegistrationInvoiceWithSplit } from "@/lib/payments/xenplatform/registration-invoice";
import { getPlatformPaymentSettings } from "@/lib/tournaments/payments/platform-settings";
import { calculateOfficialPaymentSplit } from "@/lib/tournaments/payments/split";
import { syncReclubParticipation } from "@/lib/tournaments/stats/sync";
import { computeRegistrationOpen } from "@/lib/tournaments/status-sync";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type TournamentLobbyTeam = {
  id: number;
  name: string;
  captainUserId: string | null;
  memberCount: number;
  members: { userId: string; slotIndex: number; role: string }[];
};

export type TournamentRegistrationSummary = {
  registeredTeams: number;
  registeredPlayers: number;
  maxTeams: number | null;
  spotsRemaining: number | null;
  registrationOpen: boolean;
  registrationClosesAt: string | null;
};

export async function getRegistrationSummary(
  tournamentId: number,
  maxTeams: number | null,
  registrationClosesAt: Date | null,
  registrationOpensAt?: Date | null,
  tournamentStartsAt?: Date | null,
): Promise<TournamentRegistrationSummary> {
  const db = getDb();

  const [teamRow] = await db
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
      ),
    );

  const [playerRow] = await db
    .select({ count: sql<number>`count(distinct ${tournamentTeamMembers.userId})::int` })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(eq(tournamentTeams.tournamentId, tournamentId));

  const registeredTeams = Number(teamRow?.count ?? 0);
  const registeredPlayers = Number(playerRow?.count ?? 0);
  const registrationOpen = computeRegistrationOpen(
    registrationOpensAt,
    registrationClosesAt,
    tournamentStartsAt,
  );

  return {
    registeredTeams,
    registeredPlayers,
    maxTeams,
    spotsRemaining: maxTeams != null ? Math.max(0, maxTeams - registeredTeams) : null,
    registrationOpen,
    registrationClosesAt: registrationClosesAt?.toISOString() ?? null,
  };
}

export async function listLobbyTeams(tournamentId: number): Promise<TournamentLobbyTeam[]> {
  const db = getDb();
  const teams = await db
    .select()
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .orderBy(tournamentTeams.sortOrder);

  if (!teams.length) return [];

  const teamIds = teams.map((t) => t.id);
  const members = teamIds.length
    ? await db
        .select()
        .from(tournamentTeamMembers)
        .where(inArray(tournamentTeamMembers.teamId, teamIds))
    : [];

  return teams.map((team) => {
    const teamMembers = members.filter((m) => m.teamId === team.id);
    return {
      id: team.id,
      name: team.name,
      captainUserId: team.captainUserId,
      memberCount: teamMembers.length,
      members: teamMembers.map((m) => ({
        userId: m.userId,
        slotIndex: m.slotIndex,
        role: m.role,
      })),
    };
  });
}

export async function joinReclubTournament(
  tournament: TournamentDetail,
  userId: string,
  teamName?: string,
): Promise<{ teamId: number }> {
  if (tournament.tournamentType !== "recreational") {
    throw new AppError("This tournament requires paid registration.", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const db = getDb();
  const existing = await db
    .select({ teamId: tournamentTeamMembers.teamId })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournament.id),
        eq(tournamentTeamMembers.userId, userId),
      ),
    )
    .limit(1);

  if (existing.length) {
    await syncReclubParticipation({
      tournament,
      userId,
      role: tournament.createdBy === userId ? "organizer" : "participant",
    });
    return { teamId: existing[0]!.teamId };
  }

  const playersPerTeam = tournament.playersPerTeam ?? 2;
  const openTeam = await findOpenTeam(tournament.id, playersPerTeam);

  if (openTeam) {
    const nextSlot = openTeam.memberCount;
    await db.insert(tournamentTeamMembers).values({
      teamId: openTeam.id,
      userId,
      slotIndex: nextSlot,
      role: nextSlot === 0 ? "captain" : "member",
    });
    await syncReclubParticipation({
      tournament,
      userId,
      role: tournament.createdBy === userId ? "organizer" : "participant",
    });
    return { teamId: openTeam.id };
  }

  const name =
    teamName?.trim() ||
    `Squad ${Math.floor(Math.random() * 900) + 100}`;

  const [team] = await db
    .insert(tournamentTeams)
    .values({
      tournamentId: tournament.id,
      name,
      captainUserId: userId,
    })
    .returning();

  if (!team) {
    throw new AppError("Could not create team", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  await db.insert(tournamentTeamMembers).values({
    teamId: team.id,
    userId,
    slotIndex: 0,
    role: "captain",
  });

  await db.insert(tournamentRegistrations).values({
    tournamentId: tournament.id,
    teamId: team.id,
    registeredByUserId: userId,
    status: "confirmed",
  });

  await syncReclubParticipation({
    tournament,
    userId,
    role: tournament.createdBy === userId ? "organizer" : "participant",
  });

  return { teamId: team.id };
}

async function findOpenTeam(tournamentId: number, playersPerTeam: number) {
  const teams = await listLobbyTeams(tournamentId);
  return teams.find((t) => t.memberCount < playersPerTeam) ?? null;
}

export type OfficialRegistrationInput = {
  teamName: string;
  memberUserIds: string[];
};

export type UserRegistrationStatus = {
  status: "none" | "pending_payment" | "confirmed" | "cancelled";
  registrationId: number | null;
  teamId: number | null;
  teamName: string | null;
  paymentStatus: string | null;
  invoiceUrl: string | null;
  amountIdr: number | null;
};

function assertRegistrationWindow(tournament: TournamentDetail): void {
  const now = Date.now();
  if (tournament.registrationOpensAt) {
    const opens = new Date(tournament.registrationOpensAt).getTime();
    if (now < opens) {
      throw new AppError("Registration has not opened yet.", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
  }
  if (tournament.registrationClosesAt) {
    const closes = new Date(tournament.registrationClosesAt).getTime();
    if (now > closes) {
      throw new AppError("Registration is closed.", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
  }
}

async function countActiveRegistrations(tournamentId: number): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        inArray(tournamentRegistrations.status, ["confirmed", "pending_payment"]),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function getUserRegistrationStatus(
  tournamentId: number,
  userId: string,
): Promise<UserRegistrationStatus> {
  const db = getDb();
  const [row] = await db
    .select({
      registrationId: tournamentRegistrations.id,
      status: tournamentRegistrations.status,
      teamId: tournamentRegistrations.teamId,
      teamName: tournamentTeams.name,
      paymentStatus: tournamentPayments.status,
      invoiceUrl: tournamentPayments.invoiceUrl,
      amountIdr: tournamentPayments.amountIdr,
    })
    .from(tournamentRegistrations)
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.registeredByUserId, userId),
        inArray(tournamentRegistrations.status, [
          "pending_payment",
          "confirmed",
          "cancelled",
        ]),
      ),
    )
    .orderBy(desc(tournamentRegistrations.createdAt))
    .limit(1);

  if (!row) {
    return {
      status: "none",
      registrationId: null,
      teamId: null,
      teamName: null,
      paymentStatus: null,
      invoiceUrl: null,
      amountIdr: null,
    };
  }

  const status =
    row.status === "confirmed"
      ? "confirmed"
      : row.status === "pending_payment"
        ? "pending_payment"
        : "cancelled";

  return {
    status,
    registrationId: row.registrationId,
    teamId: row.teamId,
    teamName: row.teamName,
    paymentStatus: row.paymentStatus,
    invoiceUrl: row.invoiceUrl,
    amountIdr: row.amountIdr,
  };
}

export async function getRegistrationDetail(registrationId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      registrationId: tournamentRegistrations.id,
      status: tournamentRegistrations.status,
      teamName: tournamentTeams.name,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentSlug: tournaments.slug,
      sportSlug: sports.slug,
      venue: tournaments.venue,
      categoryLabel: tournaments.categoryLabel,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      paymentStatus: tournamentPayments.status,
      invoiceUrl: tournamentPayments.invoiceUrl,
      amountIdr: tournamentPayments.amountIdr,
      paidAt: tournamentPayments.paidAt,
      registeredByUserId: tournamentRegistrations.registeredByUserId,
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

  return row ?? null;
}

export async function startOfficialRegistration(
  tournament: TournamentDetail,
  payerUserId: string,
  payerEmail: string,
  input: OfficialRegistrationInput,
): Promise<{ registrationId: number; paymentId: number; invoiceUrl: string }> {
  if (tournament.tournamentType !== "official") {
    throw new AppError("Free registration only for reclub tournaments.", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const fee = tournament.registrationFeeIdr;
  if (!fee || fee <= 0) {
    throw new AppError("Registration fee is not configured.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (!isXenditConfigured()) {
    throw new AppError("Payment gateway is not configured yet.", {
      code: "PAYMENT_NOT_CONFIGURED",
      statusCode: 503,
    });
  }

  assertRegistrationWindow(tournament);

  const existing = await getUserRegistrationStatus(tournament.id, payerUserId);
  if (existing.status === "confirmed") {
    throw new AppError("You are already registered for this tournament.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
  if (existing.status === "pending_payment" && existing.invoiceUrl) {
    return {
      registrationId: existing.registrationId!,
      paymentId: 0,
      invoiceUrl: existing.invoiceUrl,
    };
  }

  if (tournament.maxTeams) {
    const active = await countActiveRegistrations(tournament.id);
    if (active >= tournament.maxTeams) {
      throw new AppError("This tournament is full.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
  }

  const db = getDb();
  const settings = await getPlatformPaymentSettings();
  const split = calculateOfficialPaymentSplit(fee, settings);

  const [team] = await db
    .insert(tournamentTeams)
    .values({
      tournamentId: tournament.id,
      name: input.teamName.trim(),
      captainUserId: payerUserId,
    })
    .returning();

  if (!team) {
    throw new AppError("Could not create team", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const uniqueMembers = [...new Set([payerUserId, ...input.memberUserIds])];
  await db.insert(tournamentTeamMembers).values(
    uniqueMembers.map((userId, i) => ({
      teamId: team.id,
      userId,
      slotIndex: i,
      role: i === 0 ? "captain" : "member",
    })),
  );

  const [registration] = await db
    .insert(tournamentRegistrations)
    .values({
      tournamentId: tournament.id,
      teamId: team.id,
      registeredByUserId: payerUserId,
      status: "pending_payment",
    })
    .returning();

  if (!registration) {
    throw new AppError("Could not create registration", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  const externalId = `tnd-${tournament.id}-reg-${registration.id}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { invoice, splitRuleId, hostPayoutStatus } = await createRegistrationInvoiceWithSplit(
    {
      externalId,
      amount: split.totalChargeIdr,
      payerEmail,
      description: `${tournament.name} — team registration`,
      successRedirectUrl: `${appUrl}/sports/${tournament.sportSlug}/tournaments/${tournament.slug}/register/success?registrationId=${registration.id}`,
      failureRedirectUrl: `${appUrl}/sports/${tournament.sportSlug}/tournaments/${tournament.slug}/register?failed=1`,
      items: [
        {
          name: "Tournament registration",
          quantity: 1,
          price: split.registrationFeeIdr,
        },
        ...(split.processingFeeIdr > 0
          ? [
              {
                name: "Processing fee",
                quantity: 1,
                price: split.processingFeeIdr,
              },
            ]
          : []),
      ],
      metadata: {
        tournamentId: String(tournament.id),
        registrationId: String(registration.id),
        platformFeeIdr: String(split.platformFeeIdr),
        hostPayoutIdr: String(split.hostPayoutIdr),
      },
    },
    {
      tournamentId: tournament.id,
      registrationId: registration.id,
      hostUserId: tournament.createdBy,
      split,
    },
  );

  const [payment] = await db
    .insert(tournamentPayments)
    .values({
      tournamentId: tournament.id,
      registrationId: registration.id,
      payerUserId,
      xenditInvoiceId: invoice.id,
      xenditExternalId: externalId,
      amountIdr: split.totalChargeIdr,
      platformFeeIdr: split.platformFeeIdr,
      hostPayoutIdr: split.hostPayoutIdr,
      processingFeeIdr: split.processingFeeIdr,
      status: "pending",
      invoiceUrl: invoice.invoice_url,
      xenditSplitRuleId: splitRuleId,
      hostPayoutStatus,
      metadata: { split, xenPlatform: Boolean(splitRuleId) },
    })
    .returning();

  if (!payment) {
    throw new AppError("Could not record payment", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return {
    registrationId: registration.id,
    paymentId: payment.id,
    invoiceUrl: invoice.invoice_url,
  };
}

export async function confirmPaymentByInvoiceId(xenditInvoiceId: string): Promise<void> {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.xenditInvoiceId, xenditInvoiceId))
    .limit(1);

  if (!payment || payment.status === "paid") return;

  await db
    .update(tournamentPayments)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(tournamentPayments.id, payment.id));

  await db
    .update(tournamentRegistrations)
    .set({ status: "confirmed" })
    .where(eq(tournamentRegistrations.id, payment.registrationId));

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "";
  if (appOrigin) {
    const { sendRegistrationConfirmedEmails } = await import(
      "@/lib/tournaments/registration/notify-confirmed"
    );
    void sendRegistrationConfirmedEmails(payment.registrationId, appOrigin.replace(/\/$/, ""));
  }
}

export async function failPaymentByInvoiceId(
  xenditInvoiceId: string,
  reason: "expired" | "failed",
): Promise<void> {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.xenditInvoiceId, xenditInvoiceId))
    .limit(1);

  if (!payment || payment.status === "paid") return;

  await db
    .update(tournamentPayments)
    .set({ status: reason })
    .where(eq(tournamentPayments.id, payment.id));

  const [registration] = await db
    .select()
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, payment.registrationId))
    .limit(1);

  if (!registration || registration.status === "confirmed") return;

  await db
    .update(tournamentRegistrations)
    .set({ status: "cancelled" })
    .where(eq(tournamentRegistrations.id, payment.registrationId));

  if (registration.teamId) {
    await db
      .delete(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, registration.teamId));
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, registration.teamId));
  }
}
