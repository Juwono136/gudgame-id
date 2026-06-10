import "server-only";

import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerTournamentResults } from "@/db/schema/player-competition";
import { sports } from "@/db/schema/sports";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { buildPaginatedResult } from "@/lib/account/player-competition/paginate";
import type {
  PaginatedListResult,
  PlayerTournamentListItem,
} from "@/lib/account/player-competition/types";
import { canEditTournament } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import type { AppRole } from "@/lib/roles/constants";
import type { PlayerTournamentsListQuery } from "@/lib/validations/player-competition";

type UnifiedTournamentRow = PlayerTournamentListItem & { createdBy?: string | null };

function mapOfficialRow(
  row: typeof playerTournamentResults.$inferSelect,
  meta?: {
    sportSlug: string | null;
    slug: string | null;
    status: string | null;
    createdBy: string | null;
  },
): UnifiedTournamentRow {
  return {
    id: `${row.isOfficial ? "official" : "reclub"}-${row.id}`,
    source: row.isOfficial ? "official" : "recreational",
    tournamentId: row.tournamentId,
    year: row.year,
    tournamentName: row.tournamentName,
    category: row.category,
    placement: row.placement,
    playedAt: row.playedAt?.toISOString() ?? null,
    sportSlug: meta?.sportSlug ?? null,
    slug: meta?.slug ?? null,
    status: meta?.status ?? null,
    createdBy: meta?.createdBy ?? null,
    canManage: false,
    canEdit: false,
    canDelete: false,
  };
}

async function listOfficialParticipations(userId: string): Promise<UnifiedTournamentRow[]> {
  const db = getDb();

  const memberRows = await db
    .selectDistinct({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournamentTeamMembers.userId, userId),
        eq(tournaments.tournamentType, "official"),
      ),
    );

  const hostedRows = await db
    .select({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(eq(tournaments.createdBy, userId), eq(tournaments.tournamentType, "official")),
    );

  const byTournamentId = new Map<number, UnifiedTournamentRow>();

  for (const row of [...memberRows, ...hostedRows]) {
    const date = row.startsAt ?? row.createdAt;
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const isOrganizer = row.createdBy === userId;

    byTournamentId.set(row.tournamentId, {
      id: `official-${row.tournamentId}`,
      source: "official",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: row.categoryLabel ?? "Official",
      placement: isOrganizer ? "Organizer" : "Registered",
      playedAt: row.startsAt?.toISOString() ?? row.createdAt?.toISOString() ?? null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: row.status,
      createdBy: row.createdBy,
      canManage: false,
      canEdit: false,
      canDelete: false,
    });
  }

  return [...byTournamentId.values()];
}

async function listReclubParticipations(userId: string): Promise<UnifiedTournamentRow[]> {
  const db = getDb();

  const memberRows = await db
    .selectDistinct({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournamentTeamMembers.userId, userId),
        eq(tournaments.tournamentType, "recreational"),
      ),
    );

  const hostedRows = await db
    .select({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournaments.createdBy, userId),
        eq(tournaments.tournamentType, "recreational"),
      ),
    );

  const byTournamentId = new Map<number, UnifiedTournamentRow>();

  for (const row of [...memberRows, ...hostedRows]) {
    const date = row.startsAt ?? row.createdAt;
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const isOrganizer = row.createdBy === userId;

    byTournamentId.set(row.tournamentId, {
      id: `reclub-${row.tournamentId}`,
      source: "recreational",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: "Reclub",
      placement: isOrganizer ? "Organizer" : "Participant",
      playedAt: row.startsAt?.toISOString() ?? row.createdAt?.toISOString() ?? null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: row.status,
      createdBy: row.createdBy,
      canManage: false,
      canEdit: false,
      canDelete: false,
    });
  }

  return [...byTournamentId.values()];
}

function matchesSearch(row: UnifiedTournamentRow, search: string): boolean {
  const term = search.toLowerCase();
  return (
    row.tournamentName.toLowerCase().includes(term) ||
    (row.category?.toLowerCase().includes(term) ?? false) ||
    row.placement.toLowerCase().includes(term)
  );
}

function sortRows(
  rows: UnifiedTournamentRow[],
  sortBy: PlayerTournamentsListQuery["sortBy"],
  sortDir: PlayerTournamentsListQuery["sortDir"],
): UnifiedTournamentRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sortBy) {
      case "tournament":
        return a.tournamentName.localeCompare(b.tournamentName) * dir;
      case "placement": {
        const rank = (p: string) => {
          if (p === "Champion" || p === "Organizer") return 0;
          if (p === "Participant") return 50;
          return 25;
        };
        return (rank(a.placement) - rank(b.placement)) * dir;
      }
      case "year":
      default:
        return (a.year - b.year) * dir;
    }
  });
}

/** All tournaments this user created (any role: admin, host, or player). */
async function listCreatedTournamentsByUser(userId: string): Promise<UnifiedTournamentRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      startsAt: tournaments.startsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournaments.createdBy, userId))
    .orderBy(desc(tournaments.updatedAt));

  return rows.map((row) => {
    const date = row.startsAt ?? row.createdAt;
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const isOfficial = row.tournamentType === "official";
    return {
      id: `${isOfficial ? "official" : "reclub"}-${row.tournamentId}`,
      source: isOfficial ? "official" : "recreational",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: isOfficial ? (row.categoryLabel ?? "Official") : "Reclub",
      placement: "Organizer",
      playedAt: row.startsAt?.toISOString() ?? row.createdAt?.toISOString() ?? null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: row.status,
      createdBy: row.createdBy,
      canManage: false,
      canEdit: false,
      canDelete: false,
    };
  });
}

async function listJoinedTournamentsByUser(userId: string): Promise<UnifiedTournamentRow[]> {
  const officialParticipations = await listOfficialParticipations(userId);
  const reclubParticipations = await listReclubParticipations(userId);
  const officialIds = new Set(
    officialParticipations.map((r) => r.tournamentId).filter((id): id is number => id != null),
  );
  const reclubFiltered = reclubParticipations.filter(
    (r) => !r.tournamentId || !officialIds.has(r.tournamentId),
  );
  return [...officialParticipations, ...reclubFiltered].filter(
    (r) => r.createdBy !== userId,
  );
}

function applyManageFlags(
  rows: UnifiedTournamentRow[],
  userId: string,
  roles: AppRole[],
): PlayerTournamentListItem[] {
  return rows.map((row) => {
    const manages =
      row.tournamentId != null &&
      canManageTournament(roles, row.createdBy ?? null, userId);
    const editable = manages && (row.status ? canEditTournament(row.status) : true);
    const { createdBy: _c, ...rest } = row;
    return {
      ...rest,
      canManage: manages,
      canEdit: editable,
      canDelete: editable,
    };
  });
}

export async function listPlayerTournaments(
  userId: string,
  roles: AppRole[],
  query: PlayerTournamentsListQuery,
): Promise<PaginatedListResult<PlayerTournamentListItem>> {
  const db = getDb();
  const { page, pageSize, search, year, placement, sortBy, sortDir, scope } = query;

  const officialConditions = [eq(playerTournamentResults.userId, userId)];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    officialConditions.push(
      or(
        ilike(playerTournamentResults.tournamentName, term),
        ilike(playerTournamentResults.category, term),
        ilike(playerTournamentResults.placement, term),
      )!,
    );
  }

  if (year != null) {
    officialConditions.push(eq(playerTournamentResults.year, year));
  }

  if (placement?.trim()) {
    officialConditions.push(ilike(playerTournamentResults.placement, `%${placement.trim()}%`));
  }

  const officialRows = await db
    .select()
    .from(playerTournamentResults)
    .where(and(...officialConditions));

  const tournamentIds = [
    ...new Set(officialRows.map((r) => r.tournamentId).filter((id): id is number => id != null)),
  ];

  const tournamentMeta = new Map<
    number,
    { sportSlug: string; slug: string; status: string; createdBy: string | null }
  >();

  if (tournamentIds.length) {
    const metaRows = await db
      .select({
        id: tournaments.id,
        sportSlug: sports.slug,
        slug: tournaments.slug,
        status: tournaments.status,
        createdBy: tournaments.createdBy,
      })
      .from(tournaments)
      .innerJoin(sports, eq(tournaments.sportId, sports.id))
      .where(inArray(tournaments.id, tournamentIds));

    for (const m of metaRows) {
      tournamentMeta.set(m.id, {
        sportSlug: m.sportSlug,
        slug: m.slug,
        status: m.status,
        createdBy: m.createdBy,
      });
    }
  }

  let merged: UnifiedTournamentRow[];

  if (scope === "created") {
    merged = await listCreatedTournamentsByUser(userId);
  } else if (scope === "joined") {
    merged = await listJoinedTournamentsByUser(userId);
  } else {
    const created = await listCreatedTournamentsByUser(userId);
    const joined = await listJoinedTournamentsByUser(userId);
    const byTournamentId = new Map<number, UnifiedTournamentRow>();
    for (const row of [...created, ...joined]) {
      if (row.tournamentId != null) {
        byTournamentId.set(row.tournamentId, row);
      }
    }
    merged = [...byTournamentId.values()];

    const officialMapped = officialRows.map((row) =>
      mapOfficialRow(row, row.tournamentId ? tournamentMeta.get(row.tournamentId) : undefined),
    );
    for (const result of officialMapped) {
      if (result.tournamentId && !merged.some((r) => r.tournamentId === result.tournamentId)) {
        merged.push(result);
      }
    }
  }

  if (search?.trim()) {
    merged = merged.filter((r) => matchesSearch(r, search.trim()));
  }
  if (year != null) {
    merged = merged.filter((r) => r.year === year);
  }
  if (placement?.trim()) {
    const p = placement.trim().toLowerCase();
    merged = merged.filter((r) => r.placement.toLowerCase().includes(p));
  }

  merged = sortRows(merged, sortBy, sortDir);

  const total = merged.length;
  const offset = (page - 1) * pageSize;
  const slice = merged.slice(offset, offset + pageSize);
  const items = applyManageFlags(slice, userId, roles);

  return buildPaginatedResult(items, total, page, pageSize);
}

export async function listDistinctTournamentYears(
  userId: string,
  roles: AppRole[],
): Promise<number[]> {
  const list = await listPlayerTournaments(userId, roles, {
    page: 1,
    pageSize: 500,
    scope: "all",
    sortBy: "year",
    sortDir: "desc",
  });
  const years = new Set(list.items.map((i) => i.year));
  return [...years].sort((a, b) => b - a);
}
