import "server-only";

import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { sports } from "@/db/schema/sports";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { partners } from "@/db/schema/partners";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resolvePartnerSlugForTournament } from "@/lib/partners/resolve-slug";
import { isXenditConfigured } from "@/lib/payments/xendit";
import { createRegistrationInvoiceWithSplit } from "@/lib/payments/xenplatform/registration-invoice";
import type { XenditPaymentMethod } from "@/lib/payments/xendit/invoices";
import { getPlatformPaymentSettings } from "@/lib/tournaments/payments/platform-settings";
import { calculateOfficialPaymentSplit } from "@/lib/tournaments/payments/split";
import { syncReclubParticipation } from "@/lib/tournaments/stats/sync";
import { assertUserEligibleForTournamentCategory } from "@/lib/tournaments/category-eligibility";
import {
  assertUserEligibleForTournamentTier,
  assertUsersEligibleForTournamentTier,
} from "@/lib/tournaments/tier-eligibility";
import { computeRegistrationOpen } from "@/lib/tournaments/status-sync";
import { assertReclubSessionJoinable } from "@/lib/tournaments/reclub/session-guard";
import { createNamedTeam, switchTeam } from "@/lib/tournaments/reclub/teams";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import {
  isFreeOfficialBilling,
  listConfirmedOfficialTeamIds,
} from "@/lib/tournaments/registration/official-roster";
import type { OfficialBillingType } from "@/db/schema/tournaments";
import type { FunMatchJoinInput } from "@/lib/validations/tournaments";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  confirmUrl,
  checkoutUrl,
  getPaymentDueDate,
  notifyHostPaymentReceived,
  notifyHostPlayerConfirmedParticipation,
  notifyPaymentReminder,
  notifyPlayerRegistrationConfirmed,
} from "@/lib/tournaments/registration/notify-flow";
import { dispatchOfficialRosterInvites } from "@/lib/tournaments/registration/dispatch-invites";
import {
  linkedMemberIdsFromSlots,
  resolveOfficialRosterSlots,
  slotsToInsertValues,
} from "@/lib/tournaments/registration/roster-slots";
import type { OfficialRosterMemberInput } from "@/lib/validations/official-registration";
import { normalizeOfficialRosterMembers } from "@/lib/validations/official-registration";
import {
  registrationCheckoutUrl,
  registrationSuccessUrl,
} from "@/lib/tournaments/registration/urls";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { publicSportRoutes } from "@/lib/constants/routes";

const log = logger.child({ module: "tournament-registration-payments" });

async function registrationPathTournament(
  tournament: TournamentDetail,
): Promise<
  TournamentDetail & { partnerSlug: string | null }
> {
  if (!tournament.partnerId) {
    return { ...tournament, partnerSlug: tournament.partnerSlug ?? null };
  }
  if (tournament.partnerSlug) return tournament;
  const partnerSlug = await resolvePartnerSlugForTournament(tournament.partnerId);
  return { ...tournament, partnerSlug };
}
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";

export type TournamentLobbyTeam = {
  id: string; name: string;
  captainUserId: string | null;
  memberCount: number;
  members: { userId: string | null; slotIndex: number; role: string }[];
};

export type TournamentRegistrationSummary = {
  registeredTeams: number;
  registeredPlayers: number;
  maxTeams: number | null;
  /** Open team slots after counting confirmed + pending holds. */
  spotsRemaining: number | null;
  /** Confirmed + awaiting_confirmation + pending_payment (capacity holds). */
  reservedTeams: number;
  registrationOpen: boolean;
  registrationClosesAt: string | null;
};

export async function getRegistrationSummary(
  tournamentId: string,
  maxTeams: number | null,
  registrationClosesAt: Date | null,
  registrationOpensAt?: Date | null,
  tournamentStartsAt?: Date | null,
  tournamentType: "official" | "fun_match" = "official",
  officialBilling?: OfficialBillingType | string | null,
): Promise<TournamentRegistrationSummary> {
  const db = getDb();

  let registeredTeams = 0;
  let registeredPlayers = 0;

  if (tournamentType === "fun_match") {
    const [playerRow] = await db
      .select({
        count: sql<number>`count(distinct coalesce(${tournamentTeamMembers.userId}, ${tournamentTeamMembers.partnerPlayerId}::text))::int`,
      })
      .from(tournamentTeamMembers)
      .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
      .where(eq(tournamentTeams.tournamentId, tournamentId));

    const [teamRow] = await db
      .select({
        count: sql<number>`count(distinct ${tournamentTeams.id})::int`,
      })
      .from(tournamentTeams)
      .innerJoin(tournamentTeamMembers, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
      .where(eq(tournamentTeams.tournamentId, tournamentId));

    registeredPlayers = Number(playerRow?.count ?? 0);
    registeredTeams = Number(teamRow?.count ?? 0);
  } else {
    const isFree = isFreeOfficialBilling(officialBilling);

    const [confirmedRow] = await db
      .select({ count: count() })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, "confirmed"),
        ),
      );

    const reservedTeams = await countActiveRegistrations(tournamentId);

    const [playerRow] = await db
      .select({
        count: sql<number>`count(distinct coalesce(
          ${tournamentTeamMembers.userId},
          ${tournamentTeamMembers.partnerPlayerId}::text,
          ${tournamentTeamMembers.id}::text
        ))::int`,
      })
      .from(tournamentTeamMembers)
      .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
      .innerJoin(
        tournamentRegistrations,
        eq(tournamentRegistrations.teamId, tournamentTeams.id),
      )
      .leftJoin(
        tournamentPayments,
        eq(tournamentPayments.registrationId, tournamentRegistrations.id),
      )
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, "confirmed"),
          isFree ? sql`true` : eq(tournamentPayments.status, "paid"),
        ),
      );

    registeredTeams = Number(confirmedRow?.count ?? 0);
    registeredPlayers = Number(playerRow?.count ?? 0);

    const registrationOpen = computeRegistrationOpen(
      registrationOpensAt,
      registrationClosesAt,
      tournamentStartsAt,
    );

    return {
      registeredTeams,
      registeredPlayers,
      maxTeams,
      reservedTeams,
      spotsRemaining:
        maxTeams != null ? Math.max(0, maxTeams - reservedTeams) : null,
      registrationOpen,
      registrationClosesAt: registrationClosesAt?.toISOString() ?? null,
    };
  }
  const registrationOpen = computeRegistrationOpen(
    registrationOpensAt,
    registrationClosesAt,
    tournamentStartsAt,
  );

  return {
    registeredTeams,
    registeredPlayers,
    maxTeams,
    reservedTeams: registeredTeams,
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

/** Teams visible on the public tournament page — confirmed official registrations. */
export async function listOfficialPublicRoster(
  tournamentId: string,
  officialBilling?: OfficialBillingType | string | null,
): Promise<LobbyTeamView[]> {
  const confirmedTeamIds = await listConfirmedOfficialTeamIds(tournamentId, officialBilling);
  if (!confirmedTeamIds.size) return [];

  const all = await listLobbyTeamsDetailed(tournamentId);
  return all.filter((t) => confirmedTeamIds.has(t.id));
}

export async function joinFunMatchTournament(
  tournament: TournamentDetail,
  userId: string,
  input: FunMatchJoinInput,
): Promise<{ teamId: string }> {
  if (!isFunMatchType(tournament.tournamentType)) {
    throw new AppError("This tournament requires official registration.", {
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

  const existingTeamId = existing[0]?.teamId ?? null;

  assertReclubSessionJoinable(tournament);

  await assertUserEligibleForTournamentTier(userId, tournament);

  if (input.mode === "create_squad") {
    const name =
      input.teamName?.trim() ||
      `Squad ${Math.floor(Math.random() * 900) + 100}`;

    if (name.length < 2) {
      throw new AppError("Squad name must be at least 2 characters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    return createNamedTeam(tournament, userId, name);
  }

  if (existingTeamId === input.teamId) {
    await syncReclubParticipation({
      tournament,
      userId,
      role: tournament.createdBy === userId ? "organizer" : "participant",
    });
    return { teamId: input.teamId };
  }

  if (existingTeamId) {
    await switchTeam(tournament, userId, input.teamId);
    await ensureFunMatchRegistration(tournament.id, input.teamId, userId);
    await syncReclubParticipation({
      tournament,
      userId,
      role: tournament.createdBy === userId ? "organizer" : "participant",
    });
    return { teamId: input.teamId };
  }

  if (input.mode === "join_squad") {
    const [team] = await db
      .select({ id: tournamentTeams.id, memberCount: sql<number>`count(${tournamentTeamMembers.id})::int` })
      .from(tournamentTeams)
      .leftJoin(tournamentTeamMembers, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
      .where(
        and(eq(tournamentTeams.tournamentId, tournament.id), eq(tournamentTeams.id, input.teamId)),
      )
      .groupBy(tournamentTeams.id)
      .limit(1);

    if (!team) {
      throw new AppError("Squad not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const playersPerTeam = tournament.playersPerTeam ?? 2;
    if (Number(team.memberCount) >= playersPerTeam) {
      throw new AppError("This squad is full.", { code: "CONFLICT", statusCode: 409 });
    }

    await db.insert(tournamentTeamMembers).values({
      teamId: team.id,
      userId,
      slotIndex: Number(team.memberCount),
      role: Number(team.memberCount) === 0 ? "captain" : "member",
    });

    await ensureFunMatchRegistration(tournament.id, team.id, userId);
    await syncReclubParticipation({
      tournament,
      userId,
      role: tournament.createdBy === userId ? "organizer" : "participant",
    });
    return { teamId: team.id };
  }

  throw new AppError("Invalid join mode", { code: "VALIDATION_ERROR", statusCode: 422 });
}

async function ensureFunMatchRegistration(
  tournamentId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.teamId, teamId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(tournamentRegistrations).values({
      tournamentId,
      teamId,
      registeredByUserId: userId,
      status: "confirmed",
    });
  }
}

/** @deprecated Use joinFunMatchTournament */
export async function joinReclubTournament(
  tournament: TournamentDetail,
  userId: string,
  teamName?: string,
): Promise<{ teamId: string }> {
  return joinFunMatchTournament(
    tournament,
    userId,
    teamName?.trim()
      ? { mode: "create_squad", teamName }
      : { mode: "create_squad" },
  );
}

async function findOpenTeam(tournamentId: string, playersPerTeam: number) {
  const teams = await listLobbyTeams(tournamentId);
  return teams.find((t) => t.memberCount < playersPerTeam) ?? null;
}

export type OfficialRegistrationInput = {
  teamName: string;
  members?: OfficialRosterMemberInput[];
  /** @deprecated Prefer `members`. */
  memberUserIds?: string[];
};

export type RegistrationTeamMemberView = {
  userId: string | null;
  displayName: string;
  role: string;
  slotIndex: number;
  kind: "user" | "pending";
  pendingEmail: string | null;
  claimStatus: "claimed" | "pending" | null;
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
  teamMembers: RegistrationTeamMemberView[];
  paymentStatus: string | null;
  paymentId: string | null;
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

async function getRegistrationTeamMembers(
  teamId: string | null,
): Promise<RegistrationTeamMemberView[]> {
  if (!teamId) return [];

  const rows = await getDb()
    .select({
      userId: tournamentTeamMembers.userId,
      slotIndex: tournamentTeamMembers.slotIndex,
      role: tournamentTeamMembers.role,
      pendingDisplayName: tournamentTeamMembers.pendingDisplayName,
      pendingEmail: tournamentTeamMembers.pendingEmail,
      claimedAt: tournamentTeamMembers.claimedAt,
      userDisplayName: sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name})`,
    })
    .from(tournamentTeamMembers)
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(eq(tournamentTeamMembers.teamId, teamId))
    .orderBy(asc(tournamentTeamMembers.slotIndex));

  return rows
    .filter((row) => row.userId != null || row.pendingEmail != null)
    .map((row) => {
      if (row.userId) {
        return {
          userId: row.userId,
          displayName: row.userDisplayName || "Player",
          role: row.role,
          slotIndex: row.slotIndex,
          kind: "user" as const,
          pendingEmail: null,
          claimStatus: row.claimedAt ? ("claimed" as const) : null,
        };
      }
      return {
        userId: null,
        displayName: row.pendingDisplayName || "Invited player",
        role: row.role,
        slotIndex: row.slotIndex,
        kind: "pending" as const,
        pendingEmail: row.pendingEmail,
        claimStatus: "pending" as const,
      };
    });
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
      paymentId: tournamentPayments.id,
      invoiceUrl: tournamentPayments.invoiceUrl,
      amountIdr: tournamentPayments.amountIdr,
      paymentDueAt: tournamentRegistrations.paymentDueAt,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
      partnerId: tournaments.partnerId,
      partnerSlug: partners.slug,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(partners, eq(tournaments.partnerId, partners.id))
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
      teamMembers: [],
      paymentStatus: null,
      paymentId: null,
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
    partnerId: row.partnerId,
    partnerSlug: row.partnerSlug,
  };
  const teamMembers = await getRegistrationTeamMembers(row.teamId);

  return {
    status,
    registrationId: row.registrationId,
    teamId: row.teamId,
    teamName: row.teamName,
    teamMembers,
    paymentStatus: row.paymentStatus,
    paymentId: row.paymentId,
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
      teamId: tournamentRegistrations.teamId,
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
      partnerId: tournaments.partnerId,
      partnerSlug: partners.slug,
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
    .leftJoin(partners, eq(tournaments.partnerId, partners.id))
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
  const partnerSlug = await resolvePartnerSlugForTournament(tournament.partnerId);
  const successPath = registrationSuccessUrl(
    tournament.sportSlug,
    tournament.slug,
    registrationId,
    partnerSlug,
  );
  const failurePath = `${registrationCheckoutUrl(
    tournament.sportSlug,
    tournament.slug,
    registrationId,
    partnerSlug,
  )}&failed=1`;

  const { invoice, splitRuleId, hostPayoutStatus } = await createRegistrationInvoiceWithSplit(
    {
      externalId,
      amount: split.totalChargeIdr,
      payerEmail,
      description: `${tournament.name} — team registration`,
      successRedirectUrl: `${appUrl}${successPath}`,
      failureRedirectUrl: `${appUrl}${failurePath}`,
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
  status: "awaiting_confirmation" | "pending_payment" | "confirmed";
  confirmUrl?: string;
  checkoutUrl?: string;
  successUrl?: string;
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
    throw new AppError("Official registration only for official tournaments.", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const isFreeOfficial = tournament.officialBilling === "free";
  const fee = tournament.registrationFeeIdr;
  const playersPerTeam = tournament.playersPerTeam ?? 2;
  const members = normalizeOfficialRosterMembers(input);

  if (!isFreeOfficial) {
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
  }

  assertRegistrationWindow(tournament);

  await assertUserEligibleForTournamentCategory(payerUserId, tournament.categoryLabel);
  await assertUserEligibleForTournamentTier(payerUserId, tournament);

  const existing = await getUserRegistrationStatus(tournament.id, payerUserId);
  if (existing.status === "confirmed") {
    throw new AppError("You are already registered for this tournament.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
  if (existing.status === "awaiting_confirmation" && existing.registrationId) {
    const path = await registrationPathTournament(tournament);
    return {
      registrationId: existing.registrationId,
      status: "awaiting_confirmation",
      confirmUrl: existing.confirmUrl ?? confirmUrl(path, existing.registrationId),
    };
  }
  if (existing.status === "pending_payment" && existing.registrationId) {
    const path = await registrationPathTournament(tournament);
    if (existing.invoiceUrl) {
      return {
        registrationId: existing.registrationId,
        status: "pending_payment",
        checkoutUrl: existing.checkoutUrl ?? checkoutUrl(path, existing.registrationId),
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
      checkoutUrl: checkoutUrl(path, resumed.registrationId),
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

  const [captainRow] = await getDb()
    .select({ name: user.name, nickname: user.nickname })
    .from(user)
    .where(eq(user.id, payerUserId))
    .limit(1);
  const captainLabel =
    captainRow?.nickname?.trim() || captainRow?.name?.trim() || "Captain";

  let teamName = input.teamName.trim();
  if (!teamName) {
    if (playersPerTeam <= 1) {
      teamName = captainLabel;
    } else {
      throw new AppError("Team name is required.", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
  }

  const slots = await resolveOfficialRosterSlots({
    captainUserId: payerUserId,
    members,
    playersPerTeam,
    invitedByUserId: payerUserId,
    tournamentEndsAt: tournament.endsAt,
    tournamentId: tournament.id,
  });

  const linkedIds = linkedMemberIdsFromSlots(slots);
  await assertUsersEligibleForTournamentTier(linkedIds, tournament);

  const db = getDb();
  let team: { id: string };
  let registration: { id: string };

  try {
    const [insertedTeam] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId: tournament.id,
        name: teamName,
        captainUserId: payerUserId,
      })
      .returning();

    if (!insertedTeam) {
      throw new AppError("Could not create team", { code: "DATABASE_ERROR", statusCode: 500 });
    }
    team = insertedTeam;

    await db.insert(tournamentTeamMembers).values(slotsToInsertValues(team.id, slots));

    const initialStatus = isFreeOfficial ? "confirmed" : "pending_payment";

    const [insertedRegistration] = await db
      .insert(tournamentRegistrations)
      .values({
        tournamentId: tournament.id,
        teamId: team.id,
        registeredByUserId: payerUserId,
        status: initialStatus,
        confirmedAt: new Date(),
        confirmedByUserId: payerUserId,
        ...(isFreeOfficial ? {} : { paymentDueAt: getPaymentDueDate() }),
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
      const path = await registrationPathTournament(tournament);
      const retry = await getUserRegistrationStatus(tournament.id, payerUserId);
      if (retry.status === "awaiting_confirmation" && retry.registrationId) {
        return {
          registrationId: retry.registrationId,
          status: "awaiting_confirmation",
          confirmUrl: confirmUrl(path, retry.registrationId),
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
          checkoutUrl: checkoutUrl(path, resumed.registrationId),
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

  const path = await registrationPathTournament(tournament);

  if (isFreeOfficial) {
    void dispatchOfficialRosterInvites({
      tournament: path,
      registrationId: registration.id,
      teamId: team.id,
      captainUserId: payerUserId,
      teamName,
    });

    return {
      registrationId: registration.id,
      status: "confirmed",
      successUrl: publicSportRoutes.tournament(tournament.sportSlug, tournament.slug),
    };
  }

  try {
    const { amountIdr, paymentId, invoiceUrl } = await issueRegistrationInvoice(
      tournament,
      registration.id,
      payerUserId,
      payerEmail,
      fee!,
    );

    void notifyPaymentReminder(path, registration.id, payerUserId, teamName, amountIdr);
    void notifyHostPlayerConfirmedParticipation(path, registration.id, payerUserId, teamName);

    return {
      registrationId: registration.id,
      status: "pending_payment",
      checkoutUrl: checkoutUrl(path, registration.id),
      paymentId,
      invoiceUrl,
      amountIdr,
    };
  } catch (err) {
    await rollbackDraftRegistration(team.id, registration.id);
    throw err;
  }
}

export async function updateOfficialRegistration(
  tournament: TournamentDetail,
  registrationId: string,
  userId: string,
  input: OfficialRegistrationInput,
): Promise<{ registrationId: string; confirmUrl?: string; checkoutUrl?: string }> {
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

  if (
    registration.status !== "awaiting_confirmation" &&
    registration.status !== "pending_payment" &&
    !(registration.status === "confirmed" && tournament.status === "upcoming")
  ) {
    throw new AppError(
      tournament.status === "upcoming"
        ? "You can only edit your team before the tournament goes live."
        : "Roster edits are only allowed while the tournament is upcoming.",
      {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      },
    );
  }

  if (!registration.teamId) {
    throw new AppError("Team not found for this registration", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const teamId = registration.teamId;
  const members = normalizeOfficialRosterMembers(input);
  const playersPerTeam = tournament.playersPerTeam ?? 2;
  const trimmedName = input.teamName.trim();
  if (!trimmedName) {
    throw new AppError("Team name is required.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const slots = await resolveOfficialRosterSlots({
    captainUserId: userId,
    members,
    playersPerTeam,
    invitedByUserId: userId,
    tournamentEndsAt: tournament.endsAt,
    tournamentId: tournament.id,
    excludeTeamId: teamId,
  });

  const linkedIds = linkedMemberIdsFromSlots(slots);
  await assertUsersEligibleForTournamentTier(linkedIds, tournament);

  try {
    await db
      .update(tournamentTeams)
      .set({ name: trimmedName, captainUserId: userId })
      .where(eq(tournamentTeams.id, teamId));

    await db.delete(tournamentTeamMembers).where(eq(tournamentTeamMembers.teamId, teamId));

    await db.insert(tournamentTeamMembers).values(slotsToInsertValues(teamId, slots));
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

  const path = await registrationPathTournament(tournament);

  if (registration.status === "confirmed") {
    // Pending claim emails only — avoid re-spamming linked players already on the roster.
    void dispatchOfficialRosterInvites({
      tournament: path,
      registrationId,
      teamId,
      captainUserId: userId,
      teamName: trimmedName,
      linkedMemberUserIds: [],
    });
  }

  return {
    registrationId,
    confirmUrl:
      registration.status === "awaiting_confirmation"
        ? confirmUrl(path, registrationId)
        : undefined,
    checkoutUrl:
      registration.status === "pending_payment"
        ? checkoutUrl(path, registrationId)
        : undefined,
  };
}

/** Accepts either a Gud Game registrationId or a partner guest partnerRegistrationId. */
export async function confirmPaymentByRegistrationId(registrationId: string): Promise<void> {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(
      or(
        eq(tournamentPayments.registrationId, registrationId),
        eq(tournamentPayments.partnerRegistrationId, registrationId),
      ),
    )
    .limit(1);

  if (!payment || payment.status === "paid") return;
  await finalizePaidPayment(payment);
}

async function finalizePaidPayment(payment: typeof tournamentPayments.$inferSelect): Promise<void> {
  const db = getDb();

  // Partner guest registration — never touches tournamentRegistrations or Gud Game notifications.
  if (payment.partnerRegistrationId) {
    const { getPartnerRegistrationById, markPartnerRegistrationPaid } = await import(
      "@/lib/partners/registration/service"
    );
    const detail = await getPartnerRegistrationById(payment.partnerRegistrationId);
    const status = detail?.registration.status;

    // Guest cancelled / expired before webhook — do not revive the registration.
    if (!detail || status === "cancelled" || status === "expired") {
      await db
        .update(tournamentPayments)
        .set({ status: "expired" })
        .where(
          and(
            eq(tournamentPayments.id, payment.id),
            eq(tournamentPayments.status, "pending"),
          ),
        );
      log.warn("Ignored late payment webhook for cancelled/expired partner registration", {
        paymentId: payment.id,
        partnerRegistrationId: payment.partnerRegistrationId,
        registrationStatus: status ?? "missing",
      });
      return;
    }

    await db
      .update(tournamentPayments)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(tournamentPayments.id, payment.id));
    await markPartnerRegistrationPaid(payment.partnerRegistrationId);
    return;
  }

  await db
    .update(tournamentPayments)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(tournamentPayments.id, payment.id));

  if (!payment.registrationId) return;
  const registrationId = payment.registrationId;

  await db
    .update(tournamentRegistrations)
    .set({ status: "confirmed" })
    .where(eq(tournamentRegistrations.id, registrationId));

  const detail = await getRegistrationDetail(registrationId);

  if (detail?.teamId && payment.payerUserId) {
    const { getTournamentBySlug } = await import("@/lib/tournaments/service");
    const tournament = await getTournamentBySlug(detail.sportSlug, detail.tournamentSlug);
    if (tournament) {
      void dispatchOfficialRosterInvites({
        tournament,
        registrationId,
        teamId: detail.teamId,
        captainUserId: payment.payerUserId,
        teamName: detail.teamName ?? "Team",
      });
    }
  }

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "";
  if (appOrigin) {
    const { sendRegistrationConfirmedEmails } = await import(
      "@/lib/tournaments/registration/notify-confirmed"
    );
    void sendRegistrationConfirmedEmails(registrationId, appOrigin.replace(/\/$/, ""));
  }

  void notifyHostPaymentReceived(registrationId);

  if (detail && payment.payerUserId) {
    const origin = appOrigin.replace(/\/$/, "");
    const { dashboardRoutes } = await import("@/lib/constants/routes");
    void notifyPlayerRegistrationConfirmed(
      registrationId,
      payment.payerUserId,
      detail.tournamentName,
      `${origin}${dashboardRoutes.paymentReceipt(payment.id)}`,
      detail.sportName ?? undefined,
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

  if (payment.partnerRegistrationId) {
    const { expirePartnerRegistrationIfOverdue } = await import(
      "@/lib/partners/registration/service"
    );
    if (reason === "expired") {
      await expirePartnerRegistrationIfOverdue(payment.partnerRegistrationId);
      await db
        .update(tournamentPayments)
        .set({ status: "expired" })
        .where(eq(tournamentPayments.id, payment.id));
      return;
    }
    await db
      .update(tournamentPayments)
      .set({ status: "failed" })
      .where(eq(tournamentPayments.id, payment.id));
    return;
  }

  if (!payment.registrationId) return;

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
