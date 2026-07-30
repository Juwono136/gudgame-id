import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";
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
} from "@/lib/partners/registration/emails";
import { issuePartnerRegistrationInvoice } from "@/lib/partners/registration/payments";
import { buildSyntheticMemberContact, upsertPartnerPlayer } from "@/lib/partners/registration/players";
import {
  getPartnerPaymentDueDate,
  hashAccessToken,
} from "@/lib/partners/registration/tokens";
import type { PartnerGuestRegistrationInput } from "@/lib/partners/registration/validation";
import { computeRegistrationOpen } from "@/lib/tournaments/status-sync";
import type { TournamentDetail } from "@/lib/tournaments/service";

const log = logger.child({ module: "partner-registration" });

export type PartnerRegistrationContext = {
  id: string;
  slug: string;
  displayName: string;
};

export type StartPartnerGuestRegistrationResult = {
  registrationId: string;
  status: "confirmed" | "awaiting_payment";
  accessToken: string;
  payUrl?: string;
  successUrl: string;
};

export type PartnerRegistrationDetail = {
  registration: PartnerTournamentRegistration;
  members: PartnerTournamentRegistrationMember[];
  payment: typeof tournamentPayments.$inferSelect | null;
};

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function isFreeBilling(tournament: TournamentDetail): boolean {
  if (tournament.officialBilling !== "paid") return true;
  return !tournament.registrationFeeIdr || tournament.registrationFeeIdr <= 0;
}

/** Slots already claimed for this tournament — confirmed teams + pending guest holds. */
async function countReservedSpots(tournamentId: string): Promise<number> {
  const db = getDb();
  const [teamRow] = await db
    .select({ value: count() })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId));

  const [pendingRow] = await db
    .select({ value: count() })
    .from(partnerTournamentRegistrations)
    .where(
      and(
        eq(partnerTournamentRegistrations.tournamentId, tournamentId),
        eq(partnerTournamentRegistrations.status, "awaiting_payment"),
      ),
    );

  return Number(teamRow?.value ?? 0) + Number(pendingRow?.value ?? 0);
}

export async function startPartnerGuestRegistration(
  tournament: TournamentDetail,
  partner: PartnerRegistrationContext,
  input: PartnerGuestRegistrationInput,
  accessTokenPlain: string,
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

  if (tournament.maxTeams != null) {
    const reserved = await countReservedSpots(tournament.id);
    if (reserved >= tournament.maxTeams) {
      throw new AppError("This tournament is full.", { code: "CONFLICT", statusCode: 409 });
    }
  }

  const db = getDb();
  const captainEmail = input.captain.email.trim().toLowerCase();
  const captainName = input.captain.fullName.trim();

  const captainPlayer = await upsertPartnerPlayer(partner.id, {
    fullName: captainName,
    email: captainEmail,
    phone: input.captain.phone,
  });

  const [existingReg] = await db
    .select({ id: partnerTournamentRegistrations.id, status: partnerTournamentRegistrations.status })
    .from(partnerTournamentRegistrations)
    .where(
      and(
        eq(partnerTournamentRegistrations.tournamentId, tournament.id),
        eq(partnerTournamentRegistrations.captainPartnerPlayerId, captainPlayer.id),
        inArray(partnerTournamentRegistrations.status, ["awaiting_payment", "confirmed"]),
      ),
    )
    .limit(1);

  if (existingReg) {
    throw new AppError(
      existingReg.status === "confirmed"
        ? "This captain is already registered for this tournament."
        : "A pending registration already exists for this captain — check your email for the payment link.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  const isFree = isFreeBilling(tournament);
  const fee = tournament.registrationFeeIdr ?? 0;
  const teamName =
    playersPerTeam > 1 ? input.teamName?.trim() || `${captainName}'s Team` : captainName;

  const [registration] = await db
    .insert(partnerTournamentRegistrations)
    .values({
      tournamentId: tournament.id,
      partnerId: partner.id,
      status: "awaiting_payment",
      teamName,
      captainPartnerPlayerId: captainPlayer.id,
      feeIdr: isFree ? null : fee,
      accessTokenHash: hashAccessToken(accessTokenPlain),
      notes: input.notes?.trim() || null,
    })
    .returning();

  if (!registration) {
    throw new AppError("Could not create registration", { code: "DATABASE_ERROR", statusCode: 500 });
  }

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
    await confirmPartnerRegistration(registration.id, { accessTokenPlain });
    return {
      registrationId: registration.id,
      status: "confirmed",
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

/** Idempotent — safe to call again from a retried webhook. */
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

  if (registration.status !== "awaiting_payment" && registration.status !== "confirmed") {
    throw new AppError("Registration cannot be confirmed in its current state.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
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
