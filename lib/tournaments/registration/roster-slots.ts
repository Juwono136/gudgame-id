import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { normalizePartnerPhone } from "@/lib/partners/registration/phone";
import type { OfficialRosterMemberInput } from "@/lib/validations/official-registration";
import {
  generateRosterClaimToken,
  getRosterClaimExpiry,
  hashRosterClaimToken,
  normalizeInviteEmail,
} from "@/lib/tournaments/registration/claim-tokens";

export type ResolvedRosterSlot =
  | {
      kind: "linked";
      userId: string;
      slotIndex: number;
      role: "captain" | "member";
    }
  | {
      kind: "pending";
      displayName: string;
      email: string;
      phone: string | null;
      claimToken: string;
      claimTokenHash: string;
      claimExpiresAt: Date;
      slotIndex: number;
      role: "member";
      invitedByUserId: string;
    };

export async function resolveOfficialRosterSlots(input: {
  captainUserId: string;
  members: OfficialRosterMemberInput[];
  playersPerTeam: number;
  invitedByUserId: string;
  tournamentEndsAt: Date | string | null | undefined;
  tournamentId: string;
  /** Exclude this team when checking email collisions (edit flow). */
  excludeTeamId?: string | null;
}): Promise<ResolvedRosterSlot[]> {
  const maxPartners = Math.max(0, input.playersPerTeam - 1);
  if (input.members.length > maxPartners) {
    throw new AppError(
      maxPartners === 0
        ? "This event is singles — no partners allowed."
        : `You can add at most ${maxPartners} partner(s).`,
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  const slots: ResolvedRosterSlot[] = [
    {
      kind: "linked",
      userId: input.captainUserId,
      slotIndex: 0,
      role: "captain",
    },
  ];

  await assertLinkedUserAvailable({
    tournamentId: input.tournamentId,
    userId: input.captainUserId,
    excludeTeamId: input.excludeTeamId,
  });

  const seenUserIds = new Set<string>([input.captainUserId]);
  const seenEmails = new Set<string>();
  const claimExpiry = getRosterClaimExpiry(input.tournamentEndsAt);

  for (let i = 0; i < input.members.length; i += 1) {
    const member = input.members[i]!;
    const slotIndex = i + 1;

    if (member.kind === "linked") {
      if (seenUserIds.has(member.userId)) {
        throw new AppError("Each player can only appear once on the team.", {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
      await assertLinkedUserAvailable({
        tournamentId: input.tournamentId,
        userId: member.userId,
        excludeTeamId: input.excludeTeamId,
      });
      seenUserIds.add(member.userId);
      slots.push({
        kind: "linked",
        userId: member.userId,
        slotIndex,
        role: "member",
      });
      continue;
    }

    const email = normalizeInviteEmail(member.email);
    const displayName = member.displayName.trim();
    if (seenEmails.has(email)) {
      throw new AppError("Each invite email can only be used once on this team.", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }
    seenEmails.add(email);

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      if (seenUserIds.has(existingUser.id)) {
        throw new AppError("That player is already on this team.", {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
      if (existingUser.id === input.captainUserId) {
        throw new AppError("You are already the team captain.", {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
      await assertLinkedUserAvailable({
        tournamentId: input.tournamentId,
        userId: existingUser.id,
        excludeTeamId: input.excludeTeamId,
      });
      seenUserIds.add(existingUser.id);
      slots.push({
        kind: "linked",
        userId: existingUser.id,
        slotIndex,
        role: "member",
      });
      continue;
    }

    await assertPendingEmailAvailable({
      tournamentId: input.tournamentId,
      email,
      excludeTeamId: input.excludeTeamId,
    });

    let phone: string | null = null;
    if (member.phone) {
      try {
        phone = normalizePartnerPhone(member.phone);
      } catch {
        throw new AppError("Partner phone number is invalid.", {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
    }

    const claimToken = generateRosterClaimToken();
    slots.push({
      kind: "pending",
      displayName,
      email,
      phone,
      claimToken,
      claimTokenHash: hashRosterClaimToken(claimToken),
      claimExpiresAt: claimExpiry,
      slotIndex,
      role: "member",
      invitedByUserId: input.invitedByUserId,
    });
  }

  return slots;
}

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const [row] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  return row ?? null;
}

/** A Gud Game user may only occupy one team slot per tournament. */
async function assertLinkedUserAvailable(input: {
  tournamentId: string;
  userId: string;
  excludeTeamId?: string | null;
}): Promise<void> {
  const conditions = [
    eq(tournamentTeams.tournamentId, input.tournamentId),
    eq(tournamentTeamMembers.userId, input.userId),
  ];
  if (input.excludeTeamId) {
    conditions.push(ne(tournamentTeamMembers.teamId, input.excludeTeamId));
  }

  const [conflict] = await getDb()
    .select({
      teamId: tournamentTeamMembers.teamId,
      teamName: tournamentTeams.name,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(and(...conditions))
    .limit(1);

  if (conflict) {
    throw new AppError(
      `That player is already on team "${conflict.teamName}" in this tournament.`,
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}

async function assertPendingEmailAvailable(input: {
  tournamentId: string;
  email: string;
  excludeTeamId?: string | null;
}): Promise<void> {
  const db = getDb();
  const conditions = [
    eq(tournamentTeams.tournamentId, input.tournamentId),
    sql`lower(${tournamentTeamMembers.pendingEmail}) = ${input.email}`,
  ];
  if (input.excludeTeamId) {
    conditions.push(ne(tournamentTeamMembers.teamId, input.excludeTeamId));
  }

  const [conflict] = await db
    .select({ id: tournamentTeamMembers.id })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(and(...conditions))
    .limit(1);

  if (conflict) {
    throw new AppError(
      "That email is already invited on another team in this tournament.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  const linkedOnOtherTeam = await db
    .select({ id: tournamentTeamMembers.id })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(
      and(
        eq(tournamentTeams.tournamentId, input.tournamentId),
        sql`lower(${user.email}) = ${input.email}`,
        input.excludeTeamId
          ? ne(tournamentTeamMembers.teamId, input.excludeTeamId)
          : sql`true`,
      ),
    )
    .limit(1);

  if (linkedOnOtherTeam[0]) {
    throw new AppError(
      "A Gud Game player with that email is already registered on another team.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}

export function slotsToInsertValues(
  teamId: string,
  slots: ResolvedRosterSlot[],
): Array<typeof tournamentTeamMembers.$inferInsert> {
  return slots.map((slot) => {
    if (slot.kind === "linked") {
      return {
        teamId,
        userId: slot.userId,
        partnerPlayerId: null,
        pendingDisplayName: null,
        pendingEmail: null,
        pendingPhone: null,
        claimTokenHash: null,
        claimExpiresAt: null,
        claimedAt: null,
        invitedByUserId: null,
        inviteSentAt: null,
        slotIndex: slot.slotIndex,
        role: slot.role,
      };
    }
    return {
      teamId,
      userId: null,
      partnerPlayerId: null,
      pendingDisplayName: slot.displayName,
      pendingEmail: slot.email,
      pendingPhone: slot.phone,
      claimTokenHash: slot.claimTokenHash,
      claimExpiresAt: slot.claimExpiresAt,
      claimedAt: null,
      invitedByUserId: slot.invitedByUserId,
      inviteSentAt: null,
      slotIndex: slot.slotIndex,
      role: slot.role,
    };
  });
}

export function pendingTokensFromSlots(
  slots: ResolvedRosterSlot[],
): Array<{ email: string; displayName: string; token: string }> {
  return slots
    .filter((s): s is Extract<ResolvedRosterSlot, { kind: "pending" }> => s.kind === "pending")
    .map((s) => ({
      email: s.email,
      displayName: s.displayName,
      token: s.claimToken,
    }));
}

export function linkedMemberIdsFromSlots(slots: ResolvedRosterSlot[]): string[] {
  return slots.filter((s) => s.kind === "linked").map((s) => s.userId);
}
