import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import type { OfficialBillingType, TournamentType } from "@/db/schema/tournaments";
import { wikiEntities } from "@/db/schema/wiki";
import { publicSportRoutes } from "@/lib/constants/routes";
import { formatUserGender } from "@/lib/constants/user-gender";
import {
  clampPaginationParams,
  DEFAULT_PAGE_SIZE,
  toOffset,
  toTotalPages,
} from "@/lib/pagination/constants";
import { isFreeOfficialBilling } from "@/lib/tournaments/registration/official-roster";
import { getLockedTeamIdsForRemoval } from "@/lib/tournaments/participants/removal-policy";

export type TournamentParticipantRow = {
  userId: string;
  displayName: string;
  image: string | null;
  profileSlug: string | null;
  profileUrl: string | null;
  teamId: string;
  teamName: string;
  role: string;
  joinedAt: string;
  registrationStatus: string | null;
  paymentStatus: string | null;
  paidAt: string | null;
  amountIdr: number | null;
  gender: string | null;
  genderLabel: string | null;
  /** Manage UI: false when team already competed (stats/history protected). */
  canHardRemove?: boolean;
};

export type TournamentParticipantsResult = {
  items: TournamentParticipantRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tournamentType: TournamentType;
};

const displayNameSql = sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name})`;

function mapRow(
  row: {
    userId: string;
    displayName: string;
    image: string | null;
    profileSlug: string | null;
    teamId: string;
    teamName: string;
    role: string;
    joinedAt: Date;
    registrationStatus: string | null;
    paymentStatus: string | null;
    paidAt: Date | null;
    amountIdr: number | null;
    gender: string | null;
  },
  sportSlug: string,
): TournamentParticipantRow {
  const profileSlug = row.profileSlug;
  return {
    userId: row.userId,
    displayName: row.displayName,
    image: row.image,
    profileSlug,
    profileUrl:
      profileSlug != null ? publicSportRoutes.player(sportSlug, profileSlug) : null,
    teamId: row.teamId,
    teamName: row.teamName,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    registrationStatus: row.registrationStatus,
    paymentStatus: row.paymentStatus,
    paidAt: row.paidAt?.toISOString() ?? null,
    amountIdr: row.amountIdr,
    gender: row.gender,
    genderLabel: formatUserGender(row.gender),
  };
}

function publishedPlayerProfileJoin(sportId: string) {
  return and(
    eq(wikiEntities.ownerUserId, user.id),
    eq(wikiEntities.sportId, sportId),
    eq(wikiEntities.entityType, "player"),
    eq(wikiEntities.status, "published"),
  );
}

async function countReclubParticipants(tournamentId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: count() })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(eq(tournamentTeams.tournamentId, tournamentId));
  return Number(row?.count ?? 0);
}

async function countOfficialParticipants(
  tournamentId: string,
  officialBilling: OfficialBillingType | string | null | undefined,
): Promise<number> {
  const db = getDb();
  const isFree = isFreeOfficialBilling(officialBilling);

  const [row] = await db
    .select({ count: count() })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(
      tournamentRegistrations,
      and(
        eq(tournamentRegistrations.teamId, tournamentTeams.id),
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
      ),
    )
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournamentId),
        isFree
          ? sql`true`
          : eq(tournamentPayments.status, "paid"),
      ),
    );
  return Number(row?.count ?? 0);
}

async function listReclubParticipants(
  tournamentId: string,
  sportId: string,
  sportSlug: string,
  limit: number,
  offset: number,
): Promise<TournamentParticipantRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: tournamentTeamMembers.userId,
      displayName: displayNameSql,
      image: user.image,
      gender: user.gender,
      profileSlug: wikiEntities.slug,
      teamId: tournamentTeams.id,
      teamName: tournamentTeams.name,
      role: tournamentTeamMembers.role,
      joinedAt: tournamentTeamMembers.joinedAt,
      registrationStatus: sql<string | null>`null`,
      paymentStatus: sql<string | null>`null`,
      paidAt: sql<Date | null>`null`,
      amountIdr: sql<number | null>`null`,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(wikiEntities, publishedPlayerProfileJoin(sportId))
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .orderBy(asc(tournamentTeams.name), asc(tournamentTeamMembers.slotIndex))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => mapRow(row, sportSlug));
}

async function listOfficialParticipants(
  tournamentId: string,
  sportId: string,
  sportSlug: string,
  officialBilling: OfficialBillingType | string | null | undefined,
  limit: number,
  offset: number,
): Promise<TournamentParticipantRow[]> {
  const db = getDb();
  const isFree = isFreeOfficialBilling(officialBilling);

  const rows = await db
    .select({
      userId: tournamentTeamMembers.userId,
      displayName: displayNameSql,
      image: user.image,
      gender: user.gender,
      profileSlug: wikiEntities.slug,
      teamId: tournamentTeams.id,
      teamName: tournamentTeams.name,
      role: tournamentTeamMembers.role,
      joinedAt: tournamentTeamMembers.joinedAt,
      registrationStatus: tournamentRegistrations.status,
      paymentStatus: isFree
        ? sql<string | null>`'free'`
        : tournamentPayments.status,
      paidAt: tournamentPayments.paidAt,
      amountIdr: tournamentPayments.amountIdr,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(wikiEntities, publishedPlayerProfileJoin(sportId))
    .innerJoin(
      tournamentRegistrations,
      and(
        eq(tournamentRegistrations.teamId, tournamentTeams.id),
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
      ),
    )
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournamentId),
        isFree
          ? sql`true`
          : eq(tournamentPayments.status, "paid"),
      ),
    )
    .orderBy(asc(tournamentTeams.name), asc(tournamentTeamMembers.slotIndex))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => mapRow(row, sportSlug));
}

export async function queryTournamentParticipants(input: {
  tournamentId: string;
  sportId: string;
  sportSlug: string;
  tournamentType: TournamentType;
  officialBilling?: OfficialBillingType | string | null;
  page?: number;
  pageSize?: number;
}): Promise<TournamentParticipantsResult> {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const { limit, offset } = clampPaginationParams(pageSize, toOffset(page, pageSize));

  const isFunMatch = input.tournamentType === "fun_match";

  const total = isFunMatch
      ? await countReclubParticipants(input.tournamentId)
      : await countOfficialParticipants(input.tournamentId, input.officialBilling);

  const items =
    total === 0
      ? []
      : isFunMatch
        ? await listReclubParticipants(
            input.tournamentId,
            input.sportId,
            input.sportSlug,
            limit,
            offset,
          )
        : await listOfficialParticipants(
            input.tournamentId,
            input.sportId,
            input.sportSlug,
            input.officialBilling,
            limit,
            offset,
          );

  if (items.length > 0) {
    const locked = await getLockedTeamIdsForRemoval(
      input.tournamentId,
      items.map((row) => row.teamId),
    );
    for (const row of items) {
      row.canHardRemove = !locked.has(row.teamId);
    }
  }

  return {
    items,
    total,
    page,
    pageSize: limit,
    totalPages: toTotalPages(total, limit),
    tournamentType: input.tournamentType,
  };
}
