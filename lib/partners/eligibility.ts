import "server-only";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import {
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import {
  toPartnerPagedResult,
  type PartnerEligibilityListQuery,
  type PartnerPagedResult,
} from "@/lib/partners/list-query";
import { toOffset } from "@/lib/pagination/constants";

export type PartnerEligibilityRecord = {
  playerName: string;
  /** Gud Game member — null when this row is a partner guest player. */
  userId: string | null;
  /** Partner guest player — null when this row is a Gud Game user. */
  partnerPlayerId: string | null;
  tournamentId: string;
  tournamentName: string;
  categoryLabel: string | null;
  farthestRound: string;
  doublesPartnerName: string | null;
  tournamentStatus: string;
  playedAt: string | null;
};

export type PartnerEligibilitySearchResult = PartnerPagedResult<PartnerEligibilityRecord> & {
  query: string;
  /** @deprecated use items */
  records: PartnerEligibilityRecord[];
  total: number;
};

function roundLabelFromNumber(roundNumber: number, maxRound: number): string {
  const fromEnd = maxRound - roundNumber;
  if (fromEnd <= 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${roundNumber}`;
}

function sortEligibilityRecords(
  records: PartnerEligibilityRecord[],
  sortBy: PartnerEligibilityListQuery["sortBy"],
  sortDir: PartnerEligibilityListQuery["sortDir"],
): PartnerEligibilityRecord[] {
  const mul = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    if (sortBy === "playerName") {
      return mul * a.playerName.localeCompare(b.playerName);
    }
    if (sortBy === "tournamentName") {
      return mul * a.tournamentName.localeCompare(b.tournamentName);
    }
    const aTime = a.playedAt ? Date.parse(a.playedAt) : 0;
    const bTime = b.playedAt ? Date.parse(b.playedAt) : 0;
    return mul * (aTime - bTime);
  });
}

/**
 * Public / organizer factual player history for a partner tenant.
 * Not a rating system — tournament outcomes only, scoped to this partner.
 */
export async function searchPartnerPlayerEligibility(
  partnerId: string,
  input: Partial<PartnerEligibilityListQuery> & { limit?: number } = {},
): Promise<PartnerEligibilitySearchResult> {
  const q = (input.q ?? "").trim();
  if (q.length > 0 && q.length < 2) {
    throw new AppError("Search needs at least 2 characters", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const page = input.page ?? 1;
  const pageSize =
    input.pageSize ??
    (typeof input.limit === "number" ? Math.min(Math.max(input.limit, 1), 100) : 20);
  const sortBy = input.sortBy ?? "playedAt";
  const sortDir = input.sortDir ?? "desc";

  const db = getDb();

  const playerNameSql = sql<string>`coalesce(${user.name}, ${partnerPlayers.fullName})`;

  const memberConditions = [
    eq(tournaments.partnerId, partnerId),
    ...(q
      ? [
          or(
            ilike(user.name, `%${q}%`),
            ilike(partnerPlayers.fullName, `%${q}%`),
            ilike(tournaments.name, `%${q}%`),
            ilike(tournaments.categoryLabel, `%${q}%`),
          )!,
        ]
      : []),
  ];

  // Cap hydrate set so partner clubs with huge history stay responsive / harder to abuse.
  const hydrateCap = 500;
  const rows = await db
    .select({
      userId: tournamentTeamMembers.userId,
      partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
      playerName: playerNameSql,
      teamId: tournamentTeams.id,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      categoryLabel: tournaments.categoryLabel,
      tournamentStatus: tournaments.status,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .where(and(...memberConditions))
    .orderBy(desc(tournaments.startsAt), desc(tournaments.createdAt))
    .limit(hydrateCap);

  if (rows.length === 0) {
    const empty = toPartnerPagedResult<PartnerEligibilityRecord>([], 0, page, pageSize);
    return { ...empty, query: q, records: [] };
  }

  const tournamentIds = [...new Set(rows.map((r) => r.tournamentId))];
  const teamIds = [...new Set(rows.map((r) => r.teamId))];

  const mates = await db
    .select({
      teamId: tournamentTeamMembers.teamId,
      userId: tournamentTeamMembers.userId,
      partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
      name: playerNameSql,
    })
    .from(tournamentTeamMembers)
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
    .where(inArray(tournamentTeamMembers.teamId, teamIds));

  const matesByTeam = new Map<string, { playerId: string; name: string }[]>();
  for (const m of mates) {
    const playerId = m.userId ?? m.partnerPlayerId;
    if (!playerId) continue;
    const list = matesByTeam.get(m.teamId) ?? [];
    list.push({ playerId, name: m.name });
    matesByTeam.set(m.teamId, list);
  }

  const bracketRows = await db
    .select({
      tournamentId: tournamentBracketMatches.tournamentId,
      teamAId: tournamentBracketMatches.teamAId,
      teamBId: tournamentBracketMatches.teamBId,
      winnerTeamId: tournamentBracketMatches.winnerTeamId,
      roundNumber: tournamentBracketMatches.roundNumber,
      status: tournamentBracketMatches.status,
    })
    .from(tournamentBracketMatches)
    .where(inArray(tournamentBracketMatches.tournamentId, tournamentIds));

  const maxRoundByTournament = new Map<string, number>();
  for (const b of bracketRows) {
    const prev = maxRoundByTournament.get(b.tournamentId) ?? 0;
    if (b.roundNumber > prev) maxRoundByTournament.set(b.tournamentId, b.roundNumber);
  }

  const farthestRoundByTeam = new Map<string, number>();
  const wonFinalByTeam = new Set<string>();
  for (const b of bracketRows) {
    for (const teamId of [b.teamAId, b.teamBId]) {
      if (!teamId) continue;
      const key = `${b.tournamentId}:${teamId}`;
      const prev = farthestRoundByTeam.get(key) ?? 0;
      if (b.roundNumber > prev) farthestRoundByTeam.set(key, b.roundNumber);
    }
    if (b.winnerTeamId) {
      const maxRound = maxRoundByTournament.get(b.tournamentId) ?? b.roundNumber;
      if (b.roundNumber === maxRound) {
        wonFinalByTeam.add(`${b.tournamentId}:${b.winnerTeamId}`);
      }
    }
  }

  const seen = new Set<string>();
  const allRecords: PartnerEligibilityRecord[] = [];

  for (const row of rows) {
    const playerId = row.userId ?? row.partnerPlayerId;
    if (!playerId) continue;
    const dedupeKey = `${playerId}:${row.tournamentId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const teamMates = matesByTeam.get(row.teamId) ?? [];
    const partnerMate = teamMates.find((m) => m.playerId !== playerId);
    const teamKey = `${row.tournamentId}:${row.teamId}`;
    let farthest = "Registered / group stage";
    if (wonFinalByTeam.has(teamKey)) {
      farthest = "Champion";
    } else {
      const rn = farthestRoundByTeam.get(teamKey);
      if (rn != null) {
        const maxRound = maxRoundByTournament.get(row.tournamentId) ?? rn;
        farthest = roundLabelFromNumber(rn, maxRound);
      }
    }

    allRecords.push({
      playerName: row.playerName,
      userId: row.userId,
      partnerPlayerId: row.partnerPlayerId,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
      categoryLabel: row.categoryLabel,
      farthestRound: farthest,
      doublesPartnerName: partnerMate?.name ?? null,
      tournamentStatus: row.tournamentStatus,
      playedAt: (row.endsAt ?? row.startsAt)?.toISOString() ?? null,
    });
  }

  const sorted = sortEligibilityRecords(allRecords, sortBy, sortDir);
  const total = sorted.length;
  const offset = toOffset(page, pageSize);
  const items = sorted.slice(offset, offset + pageSize);
  const paged = toPartnerPagedResult(items, total, page, pageSize);

  return {
    ...paged,
    query: q,
    records: items,
  };
}

/** Lightweight count for dashboard cards. */
export async function countPartnerEligibilityPlayers(partnerId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({
      count: sql<number>`count(distinct coalesce(${tournamentTeamMembers.userId}, ${tournamentTeamMembers.partnerPlayerId}::text))`,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .where(eq(tournaments.partnerId, partnerId));
  return Number(row?.count ?? 0);
}
