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
import type { XenditPaymentMethod } from "@/lib/payments/xendit/invoices";
import { getPlatformPaymentSettings } from "@/lib/tournaments/payments/platform-settings";
import { calculateOfficialPaymentSplit } from "@/lib/tournaments/payments/split";
import { syncReclubParticipation } from "@/lib/tournaments/stats/sync";
import { computeRegistrationOpen } from "@/lib/tournaments/status-sync";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  confirmUrl,
  checkoutUrl,
  notifyAwaitingConfirmation,
  notifyHostPaymentReceived,
  notifyPlayerRegistrationConfirmed,
  notifyTeamMemberInvitations,
} from "@/lib/tournaments/registration/notify-flow";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";

export type TournamentLobbyTeam = {
  id: string; name: string;
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
  tournamentId: string,
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
    .innerJoin(
      tournamentRegistrations,
      eq(tournamentRegistrations.teamId, tournamentTeams.id),
    )
    .innerJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
        eq(tournamentPayments.status, "paid"),
      ),
    );

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

export async function listLobbyTeams(tournamentId: string): Promise<TournamentLobbyTeam[]> {
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

/** Teams visible on the public tournament page — confirmed registration with paid fee only. */
export async function listOfficialPublicRoster(tournamentId: string): Promise<LobbyTeamView[]> {
  const db = getDb();
  const paidRows = await db
    .select({ teamId: tournamentRegistrations.teamId })
    .from(tournamentRegistrations)
    .innerJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
        eq(tournamentPayments.status, "paid"),
      ),
    );

  const paidTeamIds = new Set(
    paidRows.map((r) => r.teamId).filter((id): id is string => id != null),
  );
  if (!paidTeamIds.size) return [];

  const all = await listLobbyTeamsDetailed(tournamentId);
  return all.filter((t) => paidTeamIds.has(t.id));
}

export async function joinReclubTournament(
  tournament: TournamentDetail,
  userId: string,
  teamName?: string,
): Promise<{ teamId: string }> {
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

async function findOpenTeam(tournamentId: string, playersPerTeam: number) {
  const teams = await listLobbyTeams(tournamentId);
  return teams.find((t) => t.memberCount < playersPerTeam) ?? null;
}

export type OfficialRegistrationInput = {
  teamName: string;
  memberUserIds: string[];
};

export type UserRegistrationStatus = {
  status:
    | "none"
    | "awaiting_confirmation"
    | "pending_payment"
    | "confirmed"
    | "cancelled"
    | "declined";
  registrationId: string | null;
  teamId: string | null;
  teamName: string | null;
  paymentStatus: string | null;
  invoiceUrl: string | null;
  amountIdr: number | null;
  confirmUrl: string | null;
  checkoutUrl: string | null;
  paymentDueAt: string | null;
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

async function countActiveRegistrations(tournamentId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        inArray(tournamentRegistrations.status, [
          "confirmed",
          "pending_payment",
          "awaiting_confirmation",
        ]),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function getUserRegistrationStatus(
  tournamentId: string,
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
      paymentDueAt: tournamentRegistrations.paymentDueAt,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
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
          "awaiting_confirmation",
          "pending_payment",
          "confirmed",
          "cancelled",
          "declined",
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
      confirmUrl: null,
      checkoutUrl: null,
      paymentDueAt: null,
    };
  }

  const status = row.status as UserRegistrationStatus["status"];
  const tournamentPath = {
    sportSlug: row.sportSlug,
    slug: row.tournamentSlug,
  };

  return {
    status,
    registrationId: row.registrationId,
    teamId: row.teamId,
    teamName: row.teamName,
    paymentStatus: row.paymentStatus,
    invoiceUrl: row.invoiceUrl,
    amountIdr: row.amountIdr,
    confirmUrl:
      status === "awaiting_confirmation"
        ? confirmUrl(tournamentPath, row.registrationId)
        : null,
    checkoutUrl:
      status === "pending_payment"
        ? checkoutUrl(tournamentPath, row.registrationId)
        : null,
    paymentDueAt: row.paymentDueAt?.toISOString() ?? null,
  };
}

export async function getRegistrationDetail(registrationId: string) {
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
      sportName: sports.name,
      venue: tournaments.venue,
      categoryLabel: tournaments.categoryLabel,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      paymentStatus: tournamentPayments.status,
      paymentId: tournamentPayments.id,
      invoiceUrl: tournamentPayments.invoiceUrl,
      amountIdr: tournamentPayments.amountIdr,
      platformFeeIdr: tournamentPayments.platformFeeIdr,
      processingFeeIdr: tournamentPayments.processingFeeIdr,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      registrationFeeIdr: tournaments.registrationFeeIdr,
      playersPerTeam: tournaments.playersPerTeam,
      paidAt: tournamentPayments.paidAt,
      paymentDueAt: tournamentRegistrations.paymentDueAt,
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

export async function rollbackDraftRegistration(teamId: string, registrationId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(tournamentPayments)
    .where(eq(tournamentPayments.registrationId, registrationId));
  await db
    .delete(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, registrationId));
  await db.delete(tournamentTeamMembers).where(eq(tournamentTeamMembers.teamId, teamId));
  await db.delete(tournamentTeams).where(eq(tournamentTeams.id, teamId));
}

export type IssueInvoiceOptions = {
  paymentMethods?: XenditPaymentMethod[];
  paymentMethodLabel?: string;
};

export async function issueRegistrationInvoice(
  tournament: TournamentDetail,
  registrationId: string,
  payerUserId: string,
  payerEmail: string,
  fee: number,
  options?: IssueInvoiceOptions,
): Promise<{ paymentId: string; invoiceUrl: string; amountIdr: number }> {
  const db = getDb();
  const settings = await getPlatformPaymentSettings();
  const split = calculateOfficialPaymentSplit(fee, settings);
  const externalId = `tnd-${tournament.id}-reg-${registrationId}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { invoice, splitRuleId, hostPayoutStatus } = await createRegistrationInvoiceWithSplit(
    {
      externalId,
      amount: split.totalChargeIdr,
      payerEmail,
      description: `${tournament.name} — team registration`,
      successRedirectUrl: `${appUrl}/sports/${tournament.sportSlug}/tournaments/${tournament.slug}/register/success?registrationId=${registrationId}`,
      failureRedirectUrl: `${appUrl}/sports/${tournament.sportSlug}/tournaments/${tournament.slug}/register/checkout?registrationId=${registrationId}&failed=1`,
      paymentMethods: options?.paymentMethods,
      shouldSendEmail: false,
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
        registrationId: String(registrationId),
        platformFeeIdr: String(split.platformFeeIdr),
        hostPayoutIdr: String(split.hostPayoutIdr),
      },
    },
    {
      tournamentId: tournament.id,
      registrationId,
      hostUserId: tournament.createdBy,
      split,
    },
  );

  const [existingPayment] = await db
    .select({ id: tournamentPayments.id })
    .from(tournamentPayments)
    .where(eq(tournamentPayments.registrationId, registrationId))
    .limit(1);

  if (existingPayment) {
    await db
      .update(tournamentPayments)
      .set({
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
        metadata: { split, xenPlatform: Boolean(splitRuleId), paymentMethod: options?.paymentMethodLabel },
      })
      .where(eq(tournamentPayments.id, existingPayment.id));

    return { paymentId: existingPayment.id, invoiceUrl: invoice.invoice_url, amountIdr: split.totalChargeIdr };
  }

  const [payment] = await db
    .insert(tournamentPayments)
    .values({
      tournamentId: tournament.id,
      registrationId,
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
      metadata: { split, xenPlatform: Boolean(splitRuleId), paymentMethod: options?.paymentMethodLabel },
    })
    .returning();

  if (!payment) {
    throw new AppError("Could not record payment", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return { paymentId: payment.id, invoiceUrl: invoice.invoice_url, amountIdr: split.totalChargeIdr };
}

async function resumePendingOfficialRegistration(
  tournament: TournamentDetail,
  payerUserId: string,
  payerEmail: string,
  registrationId: string,
): Promise<{ registrationId: string; paymentId: string; invoiceUrl: string; amountIdr: number }> {
  const fee = tournament.registrationFeeIdr;
  if (!fee || fee <= 0) {
    throw new AppError("Registration fee is not configured.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const { paymentId, invoiceUrl, amountIdr } = await issueRegistrationInvoice(
    tournament,
    registrationId,
    payerUserId,
    payerEmail,
    fee,
  );

  return { registrationId, paymentId, invoiceUrl, amountIdr };
}

export type OfficialRegistrationResult = {
  registrationId: string;
  status: "awaiting_confirmation" | "pending_payment";
  confirmUrl?: string;
  checkoutUrl?: string;
  paymentId?: string;
  invoiceUrl?: string;
  amountIdr?: number;
};

export async function startOfficialRegistration(
  tournament: TournamentDetail,
  payerUserId: string,
  payerEmail: string,
  input: OfficialRegistrationInput,
): Promise<OfficialRegistrationResult> {
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
  if (existing.status === "awaiting_confirmation" && existing.registrationId) {
    return {
      registrationId: existing.registrationId,
      status: "awaiting_confirmation",
      confirmUrl: existing.confirmUrl ?? confirmUrl(tournament, existing.registrationId),
    };
  }
  if (existing.status === "pending_payment" && existing.registrationId) {
    if (existing.invoiceUrl) {
      return {
        registrationId: existing.registrationId,
        status: "pending_payment",
        checkoutUrl: existing.checkoutUrl ?? checkoutUrl(tournament, existing.registrationId),
        invoiceUrl: existing.invoiceUrl,
        amountIdr: existing.amountIdr ?? undefined,
      };
    }
    const resumed = await resumePendingOfficialRegistration(
      tournament,
      payerUserId,
      payerEmail,
      existing.registrationId,
    );
    return {
      registrationId: resumed.registrationId,
      status: "pending_payment",
      checkoutUrl: checkoutUrl(tournament, resumed.registrationId),
      paymentId: resumed.paymentId,
      invoiceUrl: resumed.invoiceUrl,
      amountIdr: resumed.amountIdr,
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
  let team: { id: string };
  let registration: { id: string };
  const uniqueMembers = [...new Set([payerUserId, ...input.memberUserIds])];

  try {
    const [insertedTeam] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId: tournament.id,
        name: input.teamName.trim(),
        captainUserId: payerUserId,
      })
      .returning();

    if (!insertedTeam) {
      throw new AppError("Could not create team", { code: "DATABASE_ERROR", statusCode: 500 });
    }
    team = insertedTeam;

    await db.insert(tournamentTeamMembers).values(
      uniqueMembers.map((userId, i) => ({
        teamId: team.id,
        userId,
        slotIndex: i,
        role: i === 0 ? "captain" : "member",
      })),
    );

    const [insertedRegistration] = await db
      .insert(tournamentRegistrations)
      .values({
        tournamentId: tournament.id,
        teamId: team.id,
        registeredByUserId: payerUserId,
        status: "awaiting_confirmation",
      })
      .returning();

    if (!insertedRegistration) {
      throw new AppError("Could not create registration", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    registration = insertedRegistration;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes("tournament_teams_name_uidx") || message.includes("unique")) {
      const retry = await getUserRegistrationStatus(tournament.id, payerUserId);
      if (retry.status === "awaiting_confirmation" && retry.registrationId) {
        return {
          registrationId: retry.registrationId,
          status: "awaiting_confirmation",
          confirmUrl: confirmUrl(tournament, retry.registrationId),
        };
      }
      if (retry.status === "pending_payment" && retry.registrationId) {
        const resumed = await resumePendingOfficialRegistration(
          tournament,
          payerUserId,
          payerEmail,
          retry.registrationId,
        );
        return {
          registrationId: resumed.registrationId,
          status: "pending_payment",
          checkoutUrl: checkoutUrl(tournament, resumed.registrationId),
          paymentId: resumed.paymentId,
          invoiceUrl: resumed.invoiceUrl,
          amountIdr: resumed.amountIdr,
        };
      }
      throw new AppError("A team with this name is already registered for this tournament.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    throw cause;
  }

  void notifyAwaitingConfirmation(
    tournament,
    registration.id,
    payerUserId,
    input.teamName.trim(),
  );

  void notifyTeamMemberInvitations(
    tournament,
    registration.id,
    payerUserId,
    input.teamName.trim(),
    uniqueMembers,
  );

  return {
    registrationId: registration.id,
    status: "awaiting_confirmation",
    confirmUrl: confirmUrl(tournament, registration.id),
  };
}

export async function updateOfficialRegistration(
  tournament: TournamentDetail,
  registrationId: string,
  userId: string,
  input: OfficialRegistrationInput,
): Promise<{ registrationId: string; confirmUrl: string }> {
  if (tournament.tournamentType !== "official") {
    throw new AppError("Only official tournaments support this flow.", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  assertRegistrationWindow(tournament);

  const db = getDb();
  const [registration] = await db
    .select()
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.id, registrationId),
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.registeredByUserId, userId),
      ),
    )
    .limit(1);

  if (!registration) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status !== "awaiting_confirmation") {
    throw new AppError("You can only edit your team before confirming participation.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  if (!registration.teamId) {
    throw new AppError("Team not found for this registration", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const teamId = registration.teamId;
  const uniqueMembers = [...new Set([userId, ...input.memberUserIds])];
  const playersPerTeam = tournament.playersPerTeam ?? 2;

  if (uniqueMembers.length > playersPerTeam) {
    throw new AppError(`Teams can have at most ${playersPerTeam} players.`, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const previousMembers = await db
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, teamId));

  const previousMemberIds = previousMembers.map((m) => m.userId);
  const trimmedName = input.teamName.trim();

  try {
    await db
      .update(tournamentTeams)
      .set({ name: trimmedName, captainUserId: userId })
      .where(eq(tournamentTeams.id, teamId));

    await db.delete(tournamentTeamMembers).where(eq(tournamentTeamMembers.teamId, teamId));

    await db.insert(tournamentTeamMembers).values(
      uniqueMembers.map((memberId, i) => ({
        teamId,
        userId: memberId,
        slotIndex: i,
        role: i === 0 ? "captain" : "member",
      })),
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes("tournament_teams_name_uidx") || message.includes("unique")) {
      throw new AppError("A team with this name is already registered for this tournament.", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    throw cause;
  }

  const newInvitees = uniqueMembers.filter(
    (id) => id !== userId && !previousMemberIds.includes(id),
  );
  if (newInvitees.length) {
    void notifyTeamMemberInvitations(
      tournament,
      registrationId,
      userId,
      trimmedName,
      newInvitees,
    );
  }

  return {
    registrationId,
    confirmUrl: confirmUrl(tournament, registrationId),
  };
}

export async function confirmPaymentByRegistrationId(registrationId: string): Promise<void> {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.registrationId, registrationId))
    .limit(1);

  if (!payment || payment.status === "paid") return;
  await finalizePaidPayment(payment);
}

async function finalizePaidPayment(payment: typeof tournamentPayments.$inferSelect): Promise<void> {
  const db = getDb();
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

  void notifyHostPaymentReceived(payment.registrationId);

  const detail = await getRegistrationDetail(payment.registrationId);
  if (detail) {
    const origin = appOrigin.replace(/\/$/, "");
    const { dashboardRoutes } = await import("@/lib/constants/routes");
    void notifyPlayerRegistrationConfirmed(
      payment.registrationId,
      payment.payerUserId,
      detail.tournamentName,
      `${origin}${dashboardRoutes.paymentReceipt(payment.id)}`,
    );
  }
}

export async function confirmPaymentByInvoiceId(xenditInvoiceId: string): Promise<void> {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.xenditInvoiceId, xenditInvoiceId))
    .limit(1);

  if (!payment || payment.status === "paid") return;
  await finalizePaidPayment(payment);
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

  const { markPaymentAttemptFailed, expireRegistrationIfOverdue } = await import(
    "@/lib/tournaments/registration/payment-expiry"
  );

  if (reason === "expired") {
    await expireRegistrationIfOverdue(payment.registrationId);
    await db
      .update(tournamentPayments)
      .set({ status: "expired" })
      .where(eq(tournamentPayments.id, payment.id));
    return;
  }

  await markPaymentAttemptFailed(payment.registrationId, reason);
}
