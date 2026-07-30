import "server-only";

import { and, asc, count, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
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
import { buildParticipantSearchFilter } from "@/lib/tournaments/participants/search-filter";
import { sanitizeSearchTerm } from "@/lib/search/sanitize-search-term";

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
  /** Distinct teams/squads matching the same filters (not page-local). */
  teamCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tournamentType: TournamentType;
  /** Echo of the sanitized search applied (empty string when none). */
  search: string;
};

const displayNameSql = sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name}, ${partnerPlayers.fullName})`;
/** userId for Gud Game members, partnerPlayerId for partner guest members. */
const playerIdSql = sql<string>`coalesce(${tournamentTeamMembers.userId}, ${tournamentTeamMembers.partnerPlayerId}::text)`;

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

function reclubBaseWhere(tournamentId: string, searchFilter: SQL | undefined) {
  return and(eq(tournamentTeams.tournamentId, tournamentId), searchFilter);
}

function officialBaseWhere(
  tournamentId: string,
  officialBilling: OfficialBillingType | string | null | undefined,
  searchFilter: SQL | undefined,
) {
  const isFree = isFreeOfficialBilling(officialBilling);
  return and(
    eq(tournamentTeams.tournamentId, tournamentId),
    isFree ? sql`true` : eq(tournamentPayments.status, "paid"),
    searchFilter,
  );
}

async function countReclubParticipants(
  tournamentId: string,
  searchFilter: SQL | undefined,
): Promise<{ total: number; teamCount: number }> {
  const db = getDb();
  const where = reclubBaseWhere(tournamentId, searchFilter);

  const [row] = await db
    .select({
      count: count(),
      teamCount: sql<number>`count(distinct ${tournamentTeams.id})`,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .where(where);

  return {
    total: Number(row?.count ?? 0),
    teamCount: Number(row?.teamCount ?? 0),
  };
}

async function countOfficialParticipants(
  tournamentId: string,
  officialBilling: OfficialBillingType | string | null | undefined,
  searchFilter: SQL | undefined,
): Promise<{ total: number; teamCount: number }> {
  const db = getDb();
  const where = officialBaseWhere(tournamentId, officialBilling, searchFilter);

  const [row] = await db
    .select({
      count: count(),
      teamCount: sql<number>`count(distinct ${tournamentTeams.id})`,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
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
    .where(where);

  return {
    total: Number(row?.count ?? 0),
    teamCount: Number(row?.teamCount ?? 0),
  };
}

async function listReclubParticipants(
  tournamentId: string,
  sportId: string,
  sportSlug: string,
  limit: number,
  offset: number,
  searchFilter: SQL | undefined,
): Promise<TournamentParticipantRow[]> {
  const db = getDb();
  const pagedTeams = await db
    .select({
      teamId: tournamentTeams.id,
      teamName: tournamentTeams.name,
    })
    .from(tournamentTeams)
    .innerJoin(tournamentTeamMembers, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .where(reclubBaseWhere(tournamentId, searchFilter))
    .groupBy(tournamentTeams.id, tournamentTeams.name)
    .orderBy(asc(tournamentTeams.name))
    .limit(limit)
    .offset(offset);

  const teamIds = pagedTeams.map((team) => team.teamId);
  if (teamIds.length === 0) return [];

  const rows = await db
    .select({
      userId: playerIdSql,
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
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .leftJoin(wikiEntities, publishedPlayerProfileJoin(sportId))
    .where(and(reclubBaseWhere(tournamentId, searchFilter), inArray(tournamentTeams.id, teamIds)))
    .orderBy(asc(tournamentTeams.name), asc(tournamentTeamMembers.slotIndex))

  return rows.map((row) => mapRow(row, sportSlug));
}

async function listOfficialParticipants(
  tournamentId: string,
  sportId: string,
  sportSlug: string,
  officialBilling: OfficialBillingType | string | null | undefined,
  limit: number,
  offset: number,
  searchFilter: SQL | undefined,
): Promise<TournamentParticipantRow[]> {
  const db = getDb();
  const isFree = isFreeOfficialBilling(officialBilling);
  const pagedTeams = await db
    .select({
      teamId: tournamentTeams.id,
      teamName: tournamentTeams.name,
    })
    .from(tournamentTeams)
    .innerJoin(tournamentTeamMembers, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
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
    .where(officialBaseWhere(tournamentId, officialBilling, searchFilter))
    .groupBy(tournamentTeams.id, tournamentTeams.name)
    .orderBy(asc(tournamentTeams.name))
    .limit(limit)
    .offset(offset);

  const teamIds = pagedTeams.map((team) => team.teamId);
  if (teamIds.length === 0) return [];

  const rows = await db
    .select({
      userId: playerIdSql,
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
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
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
        officialBaseWhere(tournamentId, officialBilling, searchFilter),
        inArray(tournamentTeams.id, teamIds),
      ),
    )
    .orderBy(asc(tournamentTeams.name), asc(tournamentTeamMembers.slotIndex))

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
  search?: string;
}): Promise<TournamentParticipantsResult> {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const { limit, offset } = clampPaginationParams(pageSize, toOffset(page, pageSize));
  const search = sanitizeSearchTerm(input.search) ?? "";
  const searchFilter = buildParticipantSearchFilter(search);

  const isFunMatch = input.tournamentType === "fun_match";

  const { total, teamCount } = isFunMatch
    ? await countReclubParticipants(input.tournamentId, searchFilter)
    : await countOfficialParticipants(
        input.tournamentId,
        input.officialBilling,
        searchFilter,
      );

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
            searchFilter,
          )
        : await listOfficialParticipants(
            input.tournamentId,
            input.sportId,
            input.sportSlug,
            input.officialBilling,
            limit,
            offset,
            searchFilter,
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
    teamCount,
    page,
    pageSize: limit,
    totalPages: toTotalPages(teamCount, limit),
    tournamentType: input.tournamentType,
    search,
  };
}
