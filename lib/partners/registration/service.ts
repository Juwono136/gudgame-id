import "server-only";

import { and, asc, count, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerPlayers,
  partnerTournamentRegistrationMembers,
  partnerTournamentRegistrations,
  type PartnerTournamentRegistration,
  type PartnerTournamentRegistrationMember,
} from "@/db/schema/partner-players";
import { partners } from "@/db/schema/partners";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { logger } from "@/lib/logger";
import {
  sendPartnerRegistrationConfirmedEmail,
  sendPartnerRegistrationPaymentEmail,
  sendPartnerRegistrationPendingEmail,
} from "@/lib/partners/registration/emails";
import { issuePartnerRegistrationInvoice } from "@/lib/partners/registration/payments";
import { buildSyntheticMemberContact, upsertPartnerPlayer } from "@/lib/partners/registration/players";
import {
  getPartnerPaymentDueDate,
  hashAccessToken,
} from "@/lib/partners/registration/tokens";
import type { PartnerGuestRegistrationInput } from "@/lib/partners/registration/validation";
import type { PartnerManageRegistrationRow } from "@/lib/partners/registration/types";
import { computeRegistrationOpen } from "@/lib/tournaments/status-sync";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type { PartnerManageRegistrationRow } from "@/lib/partners/registration/types";

const log = logger.child({ module: "partner-registration" });

/** Guest holds that claim a tournament slot (including confirmed). */
const ACTIVE_SLOT_STATUSES = ["awaiting_payment", "registered", "confirmed"] as const;

export type PartnerRegistrationContext = {
  id: string;
  slug: string;
  displayName: string;
};

export type StartPartnerGuestRegistrationResult = {
  registrationId: string;
  status: "registered" | "awaiting_payment";
  accessToken: string;
  payUrl?: string;
  successUrl: string;
};

export type PartnerRegistrationDetail = {
  registration: PartnerTournamentRegistration;
  members: PartnerTournamentRegistrationMember[];
  payment: typeof tournamentPayments.$inferSelect | null;
};

export type PartnerTournamentCapacity = {
  maxTeams: number | null;
  reservedSpots: number;
  spotsRemaining: number | null;
  isFull: boolean;
};

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function isFreeBilling(tournament: TournamentDetail): boolean {
  if (tournament.officialBilling !== "paid") return true;
  return !tournament.registrationFeeIdr || tournament.registrationFeeIdr <= 0;
}

type CapacityDb = Pick<ReturnType<typeof getDb>, "select">;

/**
 * Slots already claimed: every active guest registration (payment / curation / confirmed)
 * plus lobby teams that are not linked to one of those registrations (staff-added / legacy).
 * Confirmed regs with a teamId count once (via the registration), not twice.
 */
export async function countPartnerTournamentReservedSpots(
  tournamentId: string,
  executor: CapacityDb = getDb(),
): Promise<number> {
  const [regRow] = await executor
    .select({ value: count() })
    .from(partnerTournamentRegistrations)
    .where(
      and(
        eq(partnerTournamentRegistrations.tournamentId, tournamentId),
        inArray(partnerTournamentRegistrations.status, [...ACTIVE_SLOT_STATUSES]),
      ),
    );

  const linked = await executor
    .select({ teamId: partnerTournamentRegistrations.teamId })
    .from(partnerTournamentRegistrations)
    .where(
      and(
        eq(partnerTournamentRegistrations.tournamentId, tournamentId),
        inArray(partnerTournamentRegistrations.status, [...ACTIVE_SLOT_STATUSES]),
        isNotNull(partnerTournamentRegistrations.teamId),
      ),
    );

  const linkedIds = linked
    .map((row) => row.teamId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const orphanWhere =
    linkedIds.length > 0
      ? and(
          eq(tournamentTeams.tournamentId, tournamentId),
          notInArray(tournamentTeams.id, linkedIds),
        )
      : eq(tournamentTeams.tournamentId, tournamentId);

  const [orphanRow] = await executor
    .select({ value: count() })
    .from(tournamentTeams)
    .where(orphanWhere);

  return Number(regRow?.value ?? 0) + Number(orphanRow?.value ?? 0);
}

export async function getPartnerTournamentCapacity(
  tournamentId: string,
  maxTeams: number | null | undefined,
): Promise<PartnerTournamentCapacity> {
  const reservedSpots = await countPartnerTournamentReservedSpots(tournamentId);
  const capped = maxTeams ?? null;
  const spotsRemaining = capped != null ? Math.max(0, capped - reservedSpots) : null;
  return {
    maxTeams: capped,
    reservedSpots,
    spotsRemaining,
    isFull: capped != null && reservedSpots >= capped,
  };
}

function assertTournamentHasCapacity(
  maxTeams: number | null | undefined,
  reservedSpots: number,
): void {
  if (maxTeams != null && reservedSpots >= maxTeams) {
    throw new AppError("This tournament is full.", { code: "CONFLICT", statusCode: 409 });
  }
}

export async function startPartnerGuestRegistration(
  tournament: TournamentDetail,
  partner: PartnerRegistrationContext,
  input: PartnerGuestRegistrationInput,
  accessTokenPlain: string,
  options?: {
    sessionPlayerId?: string | null;
    sessionIdentityId?: string | null;
  },
): Promise<StartPartnerGuestRegistrationResult> {
  if (tournament.partnerId !== partner.id) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const registrationOpen = computeRegistrationOpen(
    tournament.registrationOpensAt,
    tournament.registrationClosesAt,
    tournament.endsAt ?? tournament.startsAt,
  );
  if (!registrationOpen) {
    throw new AppError("Registration is closed for this tournament.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const playersPerTeam = tournament.playersPerTeam ?? 2;
  if (input.members.length !== playersPerTeam - 1) {
    throw new AppError("Roster size does not match this tournament's team size.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();
  const captainEmail = input.captain.email.trim().toLowerCase();
  const captainName = input.captain.fullName.trim();

  const captainPlayer = await upsertPartnerPlayer(
    partner.id,
    {
      fullName: captainName,
      email: captainEmail,
      phone: input.captain.phone,
    },
    {
      preferPlayerId: options?.sessionPlayerId,
      identityId: options?.sessionIdentityId,
    },
  );

  const isFree = isFreeBilling(tournament);
  const fee = tournament.registrationFeeIdr ?? 0;
  const teamName =
    playersPerTeam > 1 ? input.teamName?.trim() || `${captainName}'s Team` : captainName;

  // Serialize capacity checks so concurrent guests cannot overfill maxTeams.
  const registration = await db.transaction(async (tx) => {
    await tx
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(eq(tournaments.id, tournament.id))
      .limit(1)
      .for("update");

    const reserved = await countPartnerTournamentReservedSpots(tournament.id, tx);
    assertTournamentHasCapacity(tournament.maxTeams, reserved);

    const [existingReg] = await tx
      .select({
        id: partnerTournamentRegistrations.id,
        status: partnerTournamentRegistrations.status,
      })
      .from(partnerTournamentRegistrations)
      .where(
        and(
          eq(partnerTournamentRegistrations.tournamentId, tournament.id),
          eq(partnerTournamentRegistrations.captainPartnerPlayerId, captainPlayer.id),
          inArray(partnerTournamentRegistrations.status, [...ACTIVE_SLOT_STATUSES]),
        ),
      )
      .limit(1);

    if (existingReg) {
      throw new AppError(
        existingReg.status === "confirmed"
          ? "This captain is already confirmed for this tournament."
          : existingReg.status === "registered"
            ? "This captain already has a registration awaiting organizer confirmation."
            : "A pending registration already exists for this captain — check your email for the payment link.",
        { code: "CONFLICT", statusCode: 409 },
      );
    }

    const [created] = await tx
      .insert(partnerTournamentRegistrations)
      .values({
        tournamentId: tournament.id,
        partnerId: partner.id,
        status: isFree ? "registered" : "awaiting_payment",
        teamName,
        captainPartnerPlayerId: captainPlayer.id,
        feeIdr: isFree ? null : fee,
        accessTokenHash: hashAccessToken(accessTokenPlain),
        notes: input.notes?.trim() || null,
      })
      .returning();

    if (!created) {
      throw new AppError("Could not create registration", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }

    return created;
  });

  const memberRows: (typeof partnerTournamentRegistrationMembers.$inferInsert)[] = [
    {
      registrationId: registration.id,
      partnerPlayerId: captainPlayer.id,
      fullName: captainPlayer.fullName,
      email: captainEmail,
      phone: input.captain.phone.trim(),
      roleOrder: 0,
      isCaptain: true,
    },
  ];

  for (const [index, member] of input.members.entries()) {
    const roleOrder = index + 1;
    const memberFullName = member.fullName.trim();
    const memberEmail = member.email?.trim() || null;
    const memberPhone = member.phone?.trim() || null;
    const hasBothContacts = Boolean(memberEmail && memberPhone);
    const contact = hasBothContacts
      ? { email: memberEmail!, phone: memberPhone! }
      : buildSyntheticMemberContact(registration.id, roleOrder);

    const player = await upsertPartnerPlayer(partner.id, {
      fullName: memberFullName,
      email: contact.email,
      phone: contact.phone,
    });

    memberRows.push({
      registrationId: registration.id,
      partnerPlayerId: player.id,
      fullName: memberFullName,
      email: memberEmail,
      phone: memberPhone,
      roleOrder,
      isCaptain: false,
    });
  }

  await db.insert(partnerTournamentRegistrationMembers).values(memberRows);

  const successUrl = `${appBaseUrl()}${partnerPublicRoutes.tournamentRegisterSuccess(
    partner.slug,
    tournament.slug,
    accessTokenPlain,
  )}`;

  if (isFree) {
    await notifyPartnerRegistrationPendingReview(registration.id, {
      accessTokenPlain,
      partner,
      tournament,
      captainEmail,
      captainName,
      teamName,
      members: memberRows.map((m) => m.fullName),
    });
    return {
      registrationId: registration.id,
      status: "registered",
      accessToken: accessTokenPlain,
      successUrl,
    };
  }

  const paymentDueAt = getPartnerPaymentDueDate();
  await db
    .update(partnerTournamentRegistrations)
    .set({ paymentDueAt })
    .where(eq(partnerTournamentRegistrations.id, registration.id));

  const { amountIdr } = await issuePartnerRegistrationInvoice(
    tournament,
    { id: registration.id, teamName, accessTokenPlain },
    captainEmail,
    fee,
  );

  const payUrl = `${appBaseUrl()}${partnerPublicRoutes.tournamentRegisterPay(
    partner.slug,
    tournament.slug,
    accessTokenPlain,
  )}`;

  sendPartnerRegistrationPaymentEmail({
    captainEmail,
    captainName,
    partnerName: partner.displayName,
    partnerSlug: partner.slug,
    tournamentName: tournament.name,
    tournamentSlug: tournament.slug,
    teamName,
    amountIdr,
    accessTokenPlain,
    paymentDueAt,
  });

  return {
    registrationId: registration.id,
    status: "awaiting_payment",
    accessToken: accessTokenPlain,
    payUrl,
    successUrl,
  };
}

async function createTeamWithMembers(
  tournamentId: string,
  teamName: string,
  members: PartnerTournamentRegistrationMember[],
): Promise<string> {
  const db = getDb();
  let nameToUse = teamName;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [team] = await db
        .insert(tournamentTeams)
        .values({ tournamentId, name: nameToUse })
        .returning();

      if (!team) {
        throw new AppError("Could not create team", { code: "DATABASE_ERROR", statusCode: 500 });
      }

      await db.insert(tournamentTeamMembers).values(
        members.map((member) => ({
          teamId: team.id,
          partnerPlayerId: member.partnerPlayerId,
          slotIndex: member.roleOrder,
          role: member.isCaptain ? "captain" : "member",
        })),
      );

      return team.id;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (message.includes("tournament_teams_name_uidx") || message.includes("unique")) {
        nameToUse = `${teamName} (${attempt + 2})`;
        continue;
      }
      throw cause;
    }
  }

  throw new AppError("Could not create a unique team name for this registration.", {
    code: "CONFLICT",
    statusCode: 409,
  });
}

/**
 * After payment succeeds — mark as registered (pending partner curation).
 * Does not create a roster team until staff confirms.
 */
export async function markPartnerRegistrationPaid(
  registrationId: string,
): Promise<void> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.id, registrationId))
    .limit(1);

  if (!registration) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status === "registered" || registration.status === "confirmed") {
    return;
  }

  if (registration.status !== "awaiting_payment") {
    throw new AppError("Registration cannot accept payment in its current state.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  await db
    .update(partnerTournamentRegistrations)
    .set({ status: "registered" })
    .where(eq(partnerTournamentRegistrations.id, registrationId));

  const members = await db
    .select()
    .from(partnerTournamentRegistrationMembers)
    .where(eq(partnerTournamentRegistrationMembers.registrationId, registrationId))
    .orderBy(asc(partnerTournamentRegistrationMembers.roleOrder));

  const [tournamentRow] = await db
    .select({
      name: tournaments.name,
      slug: tournaments.slug,
    })
    .from(tournaments)
    .where(eq(tournaments.id, registration.tournamentId))
    .limit(1);

  const [partnerRow] = await db
    .select({ slug: partners.slug, displayName: partners.displayName })
    .from(partners)
    .where(eq(partners.id, registration.partnerId))
    .limit(1);

  const captainMember = members.find((m) => m.isCaptain) ?? members[0];
  if (captainMember?.email && tournamentRow && partnerRow) {
    sendPartnerRegistrationPendingEmail({
      captainEmail: captainMember.email,
      captainName: captainMember.fullName,
      partnerName: partnerRow.displayName,
      partnerSlug: partnerRow.slug,
      tournamentName: tournamentRow.name,
      tournamentSlug: tournamentRow.slug,
      teamName: registration.teamName,
      roster: members.map((m) => m.fullName),
    });
  }

  log.info("Partner guest registration paid — awaiting curation", { registrationId });
}

async function notifyPartnerRegistrationPendingReview(
  registrationId: string,
  input: {
    accessTokenPlain: string;
    partner: PartnerRegistrationContext;
    tournament: TournamentDetail;
    captainEmail: string;
    captainName: string;
    teamName: string;
    members: string[];
  },
): Promise<void> {
  sendPartnerRegistrationPendingEmail({
    captainEmail: input.captainEmail,
    captainName: input.captainName,
    partnerName: input.partner.displayName,
    partnerSlug: input.partner.slug,
    tournamentName: input.tournament.name,
    tournamentSlug: input.tournament.slug,
    teamName: input.teamName,
    roster: input.members,
  });
  log.info("Partner guest registration submitted — awaiting curation", { registrationId });
}

/** Partner staff curation — creates the squad and makes it public. Idempotent. */
export async function confirmPartnerRegistration(
  registrationId: string,
  options?: { accessTokenPlain?: string | null },
): Promise<void> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.id, registrationId))
    .limit(1);

  if (!registration) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status === "confirmed" && registration.teamId) {
    return;
  }

  if (registration.status !== "registered") {
    throw new AppError(
      registration.status === "awaiting_payment"
        ? "Payment must be completed before this registration can be confirmed."
        : "Registration cannot be confirmed in its current state.",
      {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      },
    );
  }

  const members = await db
    .select()
    .from(partnerTournamentRegistrationMembers)
    .where(eq(partnerTournamentRegistrationMembers.registrationId, registrationId))
    .orderBy(asc(partnerTournamentRegistrationMembers.roleOrder));

  if (!members.length) {
    throw new AppError("Registration has no roster", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const [tournamentRow] = await db
    .select({
      name: tournaments.name,
      slug: tournaments.slug,
      venue: tournaments.venue,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      maxTeams: tournaments.maxTeams,
    })
    .from(tournaments)
    .where(eq(tournaments.id, registration.tournamentId))
    .limit(1);

  if (!tournamentRow) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const [partnerRow] = await db
    .select({ slug: partners.slug, displayName: partners.displayName })
    .from(partners)
    .where(eq(partners.id, registration.partnerId))
    .limit(1);

  if (!partnerRow) {
    throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  // If this hold still needs a lobby team, refuse when every slot is already occupied
  // by existing teams (e.g. staff filled the bracket while this was pending).
  if (!registration.teamId && tournamentRow.maxTeams != null) {
    const [teamRow] = await db
      .select({ value: count() })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, registration.tournamentId));
    if (Number(teamRow?.value ?? 0) >= tournamentRow.maxTeams) {
      throw new AppError("This tournament is full.", { code: "CONFLICT", statusCode: 409 });
    }
  }

  const teamId =
    registration.teamId ??
    (await createTeamWithMembers(registration.tournamentId, registration.teamName, members));

  await db
    .update(partnerTournamentRegistrations)
    .set({ status: "confirmed", teamId, confirmedAt: registration.confirmedAt ?? new Date() })
    .where(eq(partnerTournamentRegistrations.id, registrationId));

  const captainMember = members.find((m) => m.isCaptain) ?? members[0];
  if (captainMember?.email) {
    const [payment] = await db
      .select({ status: tournamentPayments.status })
      .from(tournamentPayments)
      .where(eq(tournamentPayments.partnerRegistrationId, registrationId))
      .limit(1);

    sendPartnerRegistrationConfirmedEmail({
      captainEmail: captainMember.email,
      captainName: captainMember.fullName,
      partnerName: partnerRow.displayName,
      partnerSlug: partnerRow.slug,
      tournamentName: tournamentRow.name,
      tournamentSlug: tournamentRow.slug,
      teamName: registration.teamName,
      venue: tournamentRow.venue,
      startsAt: tournamentRow.startsAt,
      endsAt: tournamentRow.endsAt,
      roster: members.map((m) => m.fullName),
      accessTokenPlain: options?.accessTokenPlain ?? null,
      hasPaidReceipt: payment?.status === "paid",
    });
  }

  log.info("Partner guest registration confirmed", { registrationId, teamId });
}

async function softCancelPartnerRegistration(input: {
  registrationId: string;
  /** Guest self-cancel from checkout may only void unpaid holds. */
  allowedStatuses: Array<"awaiting_payment" | "registered">;
  source: "guest" | "staff";
}): Promise<void> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.id, input.registrationId))
    .limit(1);

  if (!registration) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status === "cancelled" || registration.status === "expired") {
    return;
  }

  if (!input.allowedStatuses.includes(registration.status as "awaiting_payment" | "registered")) {
    throw new AppError(
      input.source === "guest"
        ? "Only unpaid registrations can be cancelled from the payment page."
        : "Only pending registrations can be declined.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  if (registration.teamId) {
    throw new AppError("Cannot cancel a registration that already has a squad.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  // Race-safe: only cancel if still in an allowed pending state.
  const updated = await db
    .update(partnerTournamentRegistrations)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(partnerTournamentRegistrations.id, input.registrationId),
        inArray(partnerTournamentRegistrations.status, input.allowedStatuses),
      ),
    )
    .returning({ id: partnerTournamentRegistrations.id });

  if (!updated.length) {
    const [fresh] = await db
      .select({ status: partnerTournamentRegistrations.status })
      .from(partnerTournamentRegistrations)
      .where(eq(partnerTournamentRegistrations.id, input.registrationId))
      .limit(1);
    if (fresh?.status === "cancelled" || fresh?.status === "expired") return;
    throw new AppError("Registration could not be cancelled. Please refresh and try again.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  await db
    .update(tournamentPayments)
    .set({ status: "expired" })
    .where(
      and(
        eq(tournamentPayments.partnerRegistrationId, input.registrationId),
        eq(tournamentPayments.status, "pending"),
      ),
    );

  log.info("Partner guest registration cancelled", {
    registrationId: input.registrationId,
    source: input.source,
  });
}

/** Partner staff declines a pending (registered / awaiting payment) guest registration. */
export async function declinePartnerRegistration(registrationId: string): Promise<void> {
  await softCancelPartnerRegistration({
    registrationId,
    allowedStatuses: ["registered", "awaiting_payment"],
    source: "staff",
  });
}

/**
 * Guest self-cancel (token-gated) from payment or success pages.
 * Allowed:
 * - `awaiting_payment` (paid tournaments before checkout completes)
 * - `registered` when unpaid (free entry awaiting organizer confirmation)
 * Paid / confirmed registrations stay with partner staff.
 */
export async function cancelPartnerGuestRegistrationByToken(token: string): Promise<{
  registrationId: string;
}> {
  const detail = await getPartnerRegistrationByToken(token);
  if (!detail) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const status = detail.registration.status;
  if (status === "cancelled" || status === "expired") {
    return { registrationId: detail.registration.id };
  }

  const paymentPaid = detail.payment?.status === "paid";

  if (status === "awaiting_payment") {
    await softCancelPartnerRegistration({
      registrationId: detail.registration.id,
      allowedStatuses: ["awaiting_payment"],
      source: "guest",
    });
    return { registrationId: detail.registration.id };
  }

  if (status === "registered") {
    if (paymentPaid) {
      throw new AppError(
        "This registration is already paid. Contact the organizer if you need to cancel.",
        { code: "VALIDATION_ERROR", statusCode: 400 },
      );
    }
    await softCancelPartnerRegistration({
      registrationId: detail.registration.id,
      allowedStatuses: ["registered"],
      source: "guest",
    });
    return { registrationId: detail.registration.id };
  }

  throw new AppError(
    "Only pending registrations can be cancelled. Confirmed teams stay with the organizer.",
    { code: "VALIDATION_ERROR", statusCode: 400 },
  );
}

export async function listPartnerTournamentRegistrationsForManage(
  tournamentId: string,
  partnerId: string,
): Promise<PartnerManageRegistrationRow[]> {
  const db = getDb();
  const regs = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(
      and(
        eq(partnerTournamentRegistrations.tournamentId, tournamentId),
        eq(partnerTournamentRegistrations.partnerId, partnerId),
        inArray(partnerTournamentRegistrations.status, [
          "awaiting_payment",
          "registered",
          "confirmed",
        ]),
      ),
    )
    .orderBy(asc(partnerTournamentRegistrations.createdAt));

  if (!regs.length) return [];

  const regIds = regs.map((r) => r.id);
  const members = await db
    .select()
    .from(partnerTournamentRegistrationMembers)
    .where(inArray(partnerTournamentRegistrationMembers.registrationId, regIds))
    .orderBy(asc(partnerTournamentRegistrationMembers.roleOrder));

  const payments = await db
    .select({
      partnerRegistrationId: tournamentPayments.partnerRegistrationId,
      status: tournamentPayments.status,
    })
    .from(tournamentPayments)
    .where(inArray(tournamentPayments.partnerRegistrationId, regIds));

  const paymentByReg = new Map(
    payments
      .filter((p): p is typeof p & { partnerRegistrationId: string } =>
        Boolean(p.partnerRegistrationId),
      )
      .map((p) => [p.partnerRegistrationId, p.status]),
  );

  const membersByReg = new Map<string, typeof members>();
  for (const member of members) {
    const list = membersByReg.get(member.registrationId) ?? [];
    list.push(member);
    membersByReg.set(member.registrationId, list);
  }

  return regs.map((reg) => ({
    id: reg.id,
    status: reg.status,
    teamName: reg.teamName,
    feeIdr: reg.feeIdr,
    createdAt: reg.createdAt.toISOString(),
    confirmedAt: reg.confirmedAt?.toISOString() ?? null,
    paymentStatus: paymentByReg.get(reg.id) ?? (reg.feeIdr == null ? "free" : null),
    members: (membersByReg.get(reg.id) ?? []).map((m) => ({
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      isCaptain: m.isCaptain,
      roleOrder: m.roleOrder,
    })),
  }));
}

async function loadRegistrationDetail(
  registration: PartnerTournamentRegistration,
): Promise<PartnerRegistrationDetail> {
  const db = getDb();
  const members = await db
    .select()
    .from(partnerTournamentRegistrationMembers)
    .where(eq(partnerTournamentRegistrationMembers.registrationId, registration.id))
    .orderBy(asc(partnerTournamentRegistrationMembers.roleOrder));

  const [payment] = await db
    .select()
    .from(tournamentPayments)
    .where(eq(tournamentPayments.partnerRegistrationId, registration.id))
    .limit(1);

  return { registration, members, payment: payment ?? null };
}

/** Expires a stale awaiting_payment registration in place — called lazily on read. */
async function expireIfOverdue(
  registration: PartnerTournamentRegistration,
): Promise<PartnerTournamentRegistration> {
  if (registration.status !== "awaiting_payment") return registration;
  if (!registration.paymentDueAt) return registration;
  if (registration.paymentDueAt.getTime() > Date.now()) return registration;

  const db = getDb();
  await db
    .update(partnerTournamentRegistrations)
    .set({ status: "expired" })
    .where(
      and(
        eq(partnerTournamentRegistrations.id, registration.id),
        eq(partnerTournamentRegistrations.status, "awaiting_payment"),
      ),
    );
  await db
    .update(tournamentPayments)
    .set({ status: "expired" })
    .where(
      and(
        eq(tournamentPayments.partnerRegistrationId, registration.id),
        eq(tournamentPayments.status, "pending"),
      ),
    );

  return { ...registration, status: "expired" };
}

export async function expirePartnerRegistrationIfOverdue(registrationId: string): Promise<void> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.id, registrationId))
    .limit(1);
  if (!registration) return;
  await expireIfOverdue(registration);
}

export async function getPartnerRegistrationByToken(
  token: string,
): Promise<PartnerRegistrationDetail | null> {
  const hash = hashAccessToken(token);
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.accessTokenHash, hash))
    .limit(1);

  if (!registration) return null;

  const fresh = await expireIfOverdue(registration);
  return loadRegistrationDetail(fresh);
}

export async function getPartnerRegistrationById(
  registrationId: string,
): Promise<PartnerRegistrationDetail | null> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(partnerTournamentRegistrations)
    .where(eq(partnerTournamentRegistrations.id, registrationId))
    .limit(1);

  if (!registration) return null;

  const fresh = await expireIfOverdue(registration);
  return loadRegistrationDetail(fresh);
}

export function assertPartnerRegistrationOwnedByPartner(
  registration: Pick<PartnerTournamentRegistration, "partnerId" | "tournamentId">,
  partner: { id: string },
  tournament: { id: string },
): void {
  if (registration.partnerId !== partner.id || registration.tournamentId !== tournament.id) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }
}

export async function findPartnerPlayerContact(
  partnerPlayerId: string,
): Promise<{ fullName: string; email: string; phone: string } | null> {
  const [row] = await getDb()
    .select({
      fullName: partnerPlayers.fullName,
      email: partnerPlayers.email,
      phone: partnerPlayers.phone,
    })
    .from(partnerPlayers)
    .where(eq(partnerPlayers.id, partnerPlayerId))
    .limit(1);
  return row ?? null;
}

const VIEWER_ACTIVE_STATUSES = ["awaiting_payment", "registered", "confirmed"] as const;

export type ViewerPartnerRegistrationStatus = {
  status: "none" | (typeof VIEWER_ACTIVE_STATUSES)[number] | "cancelled" | "expired";
  isRegistered: boolean;
  registrationId: string | null;
  teamId: string | null;
  isAuthenticated: boolean;
};

/**
 * Resolve whether the signed-in viewer already has a guest registration / team
 * on this partner tournament (matched by account email on the roster).
 */
export async function getViewerPartnerRegistrationStatus(input: {
  tournamentId: string;
  partnerId: string;
  userEmail: string | null | undefined;
  userId: string | null | undefined;
}): Promise<ViewerPartnerRegistrationStatus> {
  const email = input.userEmail?.trim().toLowerCase() || null;
  if (!email && !input.userId) {
    return {
      status: "none",
      isRegistered: false,
      registrationId: null,
      teamId: null,
      isAuthenticated: false,
    };
  }

  const db = getDb();

  if (email) {
    const [byEmail] = await db
      .select({
        id: partnerTournamentRegistrations.id,
        status: partnerTournamentRegistrations.status,
        teamId: partnerTournamentRegistrations.teamId,
      })
      .from(partnerTournamentRegistrationMembers)
      .innerJoin(
        partnerTournamentRegistrations,
        eq(
          partnerTournamentRegistrationMembers.registrationId,
          partnerTournamentRegistrations.id,
        ),
      )
      .where(
        and(
          eq(partnerTournamentRegistrations.tournamentId, input.tournamentId),
          eq(partnerTournamentRegistrations.partnerId, input.partnerId),
          eq(partnerTournamentRegistrationMembers.email, email),
          inArray(partnerTournamentRegistrations.status, [...VIEWER_ACTIVE_STATUSES]),
        ),
      )
      .limit(1);

    if (byEmail) {
      const status = byEmail.status as ViewerPartnerRegistrationStatus["status"];
      return {
        status,
        isRegistered: true,
        registrationId: byEmail.id,
        teamId: byEmail.teamId,
        isAuthenticated: true,
      };
    }
  }

  if (input.userId) {
    const { getUserTeamInTournament } = await import("@/lib/tournaments/reclub/teams");
    const teamId = await getUserTeamInTournament(input.tournamentId, input.userId);
    if (teamId) {
      return {
        status: "confirmed",
        isRegistered: true,
        registrationId: null,
        teamId,
        isAuthenticated: true,
      };
    }
  }

  return {
    status: "none",
    isRegistered: false,
    registrationId: null,
    teamId: null,
    isAuthenticated: Boolean(email || input.userId),
  };
}
