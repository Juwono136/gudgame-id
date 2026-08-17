import "server-only";

import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerTournamentResults } from "@/db/schema/player-competition";
import { sports } from "@/db/schema/sports";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { buildPaginatedResult } from "@/lib/account/player-competition/paginate";
import { tournamentResultPriority } from "@/lib/account/player-competition/format-outcome";
import {
  computeTournamentStatus,
  syncTournamentStatusFromSchedule,
} from "@/lib/tournaments/status-sync";
import type { TournamentStatus } from "@/db/schema/tournaments";

/** Matches fun_match rows and legacy recreational before migration backfill. */
function funMatchTypeCondition() {
  return or(
    eq(tournaments.tournamentType, "fun_match"),
    eq(tournaments.tournamentType, "recreational"),
  );
}

function funMatchCategory(categoryLabel: string | null | undefined): string {
  return categoryLabel?.trim() || "Fun Match";
}

function mapBilling(value: string | null | undefined): "paid" | "free" | null {
  if (value === "paid" || value === "free") return value;
  return null;
}
import type {
  PaginatedListResult,
  PlayerTournamentListItem,
} from "@/lib/account/player-competition/types";
import { canEditTournament } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import type { AppRole } from "@/lib/roles/constants";
import type { PlayerTournamentsListQuery } from "@/lib/validations/player-competition";

type UnifiedTournamentRow = PlayerTournamentListItem & {
  createdBy?: string | null;
  startsAtDate?: Date | null;
  endsAtDate?: Date | null;
};

function resolveRowStatus(
  rawStatus: string | null | undefined,
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
): string {
  if (!rawStatus) return "upcoming";
  return computeTournamentStatus(rawStatus as TournamentStatus, startsAt ?? null, endsAt ?? null);
}

function mapOfficialRow(
  row: typeof playerTournamentResults.$inferSelect,
  meta?: {
    sportSlug: string | null;
    slug: string | null;
    status: string | null;
    createdBy: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    format: string | null;
    officialBilling: string | null;
    venue: string | null;
    categoryLabel: string | null;
  },
): UnifiedTournamentRow {
  const isOfficial = row.isOfficial;
  return {
    id: `${isOfficial ? "official" : "reclub"}-${row.id}`,
    source: isOfficial ? "official" : "fun_match",
    tournamentId: row.tournamentId,
    year: row.year,
    tournamentName: row.tournamentName,
    category: isOfficial
      ? (meta?.categoryLabel ?? row.category ?? "Official")
      : funMatchCategory(meta?.categoryLabel ?? row.category),
    placement: row.placement,
    playedAt: row.playedAt?.toISOString() ?? null,
    sportSlug: meta?.sportSlug ?? null,
    slug: meta?.slug ?? null,
    status: resolveRowStatus(meta?.status, meta?.startsAt, meta?.endsAt),
    format: meta?.format ?? null,
    officialBilling: isOfficial ? mapBilling(meta?.officialBilling) : null,
    venue: meta?.venue ?? null,
    startsAt: meta?.startsAt?.toISOString() ?? null,
    endsAt: meta?.endsAt?.toISOString() ?? null,
    startsAtDate: meta?.startsAt ?? null,
    endsAtDate: meta?.endsAt ?? null,
    createdBy: meta?.createdBy ?? null,
    canManage: false,
    canEdit: false,
    canDelete: false,
  };
}

async function listOfficialParticipations(userId: string): Promise<UnifiedTournamentRow[]> {
  const db = getDb();

  const captainRegs = await db
    .select({
      tournamentId: tournamentRegistrations.tournamentId,
      registrationId: tournamentRegistrations.id,
      status: tournamentRegistrations.status,
      teamName: tournamentTeams.name,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .where(
      and(
        eq(tournamentRegistrations.registeredByUserId, userId),
        eq(tournaments.tournamentType, "official"),
        inArray(tournamentRegistrations.status, [
          "awaiting_confirmation",
          "pending_payment",
          "confirmed",
        ]),
      ),
    );

  const regByTournament = new Map(
    captainRegs.map((r) => [
      r.tournamentId,
      { registrationId: r.registrationId, status: r.status, teamName: r.teamName },
    ]),
  );

  const memberRows = await db
    .selectDistinct({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
      format: tournaments.format,
      officialBilling: tournaments.officialBilling,
      venue: tournaments.venue,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournamentTeamMembers.userId, userId),
        eq(tournaments.tournamentType, "official"),
        isNull(tournaments.partnerId),
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
      endsAt: tournaments.endsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
      format: tournaments.format,
      officialBilling: tournaments.officialBilling,
      venue: tournaments.venue,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournaments.createdBy, userId),
        eq(tournaments.tournamentType, "official"),
        isNull(tournaments.partnerId),
      ),
    );

  const byTournamentId = new Map<string, UnifiedTournamentRow>();

  for (const row of [...memberRows, ...hostedRows]) {
    const date = row.startsAt ?? row.createdAt;
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const isOrganizer = row.createdBy === userId;
    const reg = regByTournament.get(row.tournamentId);

    byTournamentId.set(row.tournamentId, {
      id: `official-${row.tournamentId}`,
      source: "official",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: row.categoryLabel ?? "Official",
      placement: isOrganizer ? "Hosted" : reg?.status === "confirmed" ? "Registered" : "Pending",
      playedAt: row.startsAt?.toISOString() ?? row.createdAt?.toISOString() ?? null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: resolveRowStatus(row.status, row.startsAt, row.endsAt),
      format: row.format ?? null,
      officialBilling: mapBilling(row.officialBilling),
      venue: row.venue ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      startsAtDate: row.startsAt,
      endsAtDate: row.endsAt,
      createdBy: row.createdBy,
      canManage: false,
      canEdit: false,
      canDelete: false,
      registrationId: reg?.registrationId ?? null,
      registrationStatus: reg?.status ?? null,
      registrationTeamName: reg?.teamName ?? null,
      canEditRegistration: reg?.status === "awaiting_confirmation",
      canManageRegistration:
        reg?.status === "awaiting_confirmation" || reg?.status === "pending_payment",
    });
  }

  return [...byTournamentId.values()];
}

async function listReclubParticipations(userId: string): Promise<UnifiedTournamentRow[]> {
  const db = getDb();

  const funMatchSelect = {
    tournamentId: tournaments.id,
    tournamentName: tournaments.name,
    slug: tournaments.slug,
    sportSlug: sports.slug,
    status: tournaments.status,
    startsAt: tournaments.startsAt,
    endsAt: tournaments.endsAt,
    createdAt: tournaments.createdAt,
    createdBy: tournaments.createdBy,
    categoryLabel: tournaments.categoryLabel,
    format: tournaments.format,
    venue: tournaments.venue,
  } as const;

  const memberRows = await db
    .selectDistinct(funMatchSelect)
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournamentTeamMembers.userId, userId),
        funMatchTypeCondition(),
        isNull(tournaments.partnerId),
      ),
    );

  const registrationRows = await db
    .selectDistinct(funMatchSelect)
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournamentRegistrations.registeredByUserId, userId),
        funMatchTypeCondition(),
        isNull(tournaments.partnerId),
        inArray(tournamentRegistrations.status, ["confirmed"]),
      ),
    );

  const hostedRows = await db
    .select(funMatchSelect)
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(tournaments.createdBy, userId),
        funMatchTypeCondition(),
        isNull(tournaments.partnerId),
      ),
    );

  const resultRows = await db
    .select({
      tournamentId: playerTournamentResults.tournamentId,
      tournamentName: playerTournamentResults.tournamentName,
      year: playerTournamentResults.year,
      placement: playerTournamentResults.placement,
      playedAt: playerTournamentResults.playedAt,
      category: playerTournamentResults.category,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
      format: tournaments.format,
      venue: tournaments.venue,
    })
    .from(playerTournamentResults)
    .leftJoin(tournaments, eq(playerTournamentResults.tournamentId, tournaments.id))
    .leftJoin(sports, eq(tournaments.sportId, sports.id))
    .where(
      and(
        eq(playerTournamentResults.userId, userId),
        eq(playerTournamentResults.isOfficial, false),
        isNull(playerTournamentResults.partnerId),
      ),
    );

  const byTournamentId = new Map<string, UnifiedTournamentRow>();

  for (const row of [...memberRows, ...registrationRows, ...hostedRows]) {
    const date = row.startsAt ?? row.createdAt;
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const isOrganizer = row.createdBy === userId;

    byTournamentId.set(row.tournamentId, {
      id: `reclub-${row.tournamentId}`,
      source: "fun_match",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: funMatchCategory(row.categoryLabel),
      placement: isOrganizer ? "Hosted" : "Competed",
      playedAt: row.startsAt?.toISOString() ?? row.createdAt?.toISOString() ?? null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: resolveRowStatus(row.status, row.startsAt, row.endsAt),
      format: row.format ?? null,
      officialBilling: null,
      venue: row.venue ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      startsAtDate: row.startsAt,
      endsAtDate: row.endsAt,
      createdBy: row.createdBy,
      canManage: false,
      canEdit: false,
      canDelete: false,
    });
  }

  for (const row of resultRows) {
    if (row.tournamentId == null) continue;
    if (byTournamentId.has(row.tournamentId)) continue;

    const date = row.playedAt ?? row.startsAt ?? row.createdAt;
    const year = row.year ?? (date ? new Date(date).getFullYear() : new Date().getFullYear());
    const isOrganizer = row.createdBy === userId;

    byTournamentId.set(row.tournamentId, {
      id: `reclub-${row.tournamentId}`,
      source: "fun_match",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: funMatchCategory(row.categoryLabel ?? row.category),
      placement: row.placement ?? (isOrganizer ? "Hosted" : "Competed"),
      playedAt:
        row.playedAt?.toISOString() ??
        row.startsAt?.toISOString() ??
        row.createdAt?.toISOString() ??
        null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: resolveRowStatus(row.status, row.startsAt, row.endsAt),
      format: row.format ?? null,
      officialBilling: null,
      venue: row.venue ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      startsAtDate: row.startsAt,
      endsAtDate: row.endsAt,
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
    (row.venue?.toLowerCase().includes(term) ?? false) ||
    (row.format?.toLowerCase().includes(term) ?? false) ||
    row.placement.toLowerCase().includes(term)
  );
}

const STATUS_SORT_ORDER: Record<string, number> = {
  live: 0,
  upcoming: 1,
  draft: 2,
  completed: 3,
  cancelled: 4,
};

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
          if (p === "Champion" || p === "Hosted" || p === "Organizer") return 0;
          if (p === "Competed" || p === "Participant") return 50;
          return 25;
        };
        return (rank(a.placement) - rank(b.placement)) * dir;
      }
      case "status": {
        const aRank = STATUS_SORT_ORDER[a.status ?? ""] ?? 99;
        const bRank = STATUS_SORT_ORDER[b.status ?? ""] ?? 99;
        return (aRank - bRank) * dir;
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
      endsAt: tournaments.endsAt,
      createdAt: tournaments.createdAt,
      createdBy: tournaments.createdBy,
      categoryLabel: tournaments.categoryLabel,
      format: tournaments.format,
      officialBilling: tournaments.officialBilling,
      venue: tournaments.venue,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(eq(tournaments.createdBy, userId), isNull(tournaments.partnerId)))
    .orderBy(desc(tournaments.updatedAt));

  return rows.map((row) => {
    const date = row.startsAt ?? row.createdAt;
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const isOfficial = row.tournamentType === "official";
    return {
      id: `${isOfficial ? "official" : "reclub"}-${row.tournamentId}`,
      source: (isOfficial ? "official" : "fun_match") as "official" | "fun_match",
      tournamentId: row.tournamentId,
      year,
      tournamentName: row.tournamentName,
      category: isOfficial
        ? (row.categoryLabel ?? "Official")
        : funMatchCategory(row.categoryLabel),
      placement: "Hosted",
      playedAt: row.startsAt?.toISOString() ?? row.createdAt?.toISOString() ?? null,
      sportSlug: row.sportSlug,
      slug: row.slug,
      status: resolveRowStatus(row.status, row.startsAt, row.endsAt),
      format: row.format ?? null,
      officialBilling: isOfficial ? mapBilling(row.officialBilling) : null,
      venue: row.venue ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      startsAtDate: row.startsAt,
      endsAtDate: row.endsAt,
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
    officialParticipations.map((r) => r.tournamentId).filter((id): id is string => id != null),
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
    const {
      createdBy: _c,
      startsAtDate: _s,
      endsAtDate: _e,
      ...rest
    } = row;
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
  const { page, pageSize, search, year, placement, sortBy, sortDir, scope, type, status } =
    query;

  const officialConditions = [
    eq(playerTournamentResults.userId, userId),
    isNull(playerTournamentResults.partnerId),
  ];

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
    ...new Set(officialRows.map((r) => r.tournamentId).filter((id): id is string => id != null)),
  ];

  const tournamentMeta = new Map<
    string,
    {
      sportSlug: string;
      slug: string;
      status: string;
      createdBy: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
      format: string | null;
      officialBilling: string | null;
      venue: string | null;
      categoryLabel: string | null;
    }
  >();

  if (tournamentIds.length) {
    const metaRows = await db
      .select({
        id: tournaments.id,
        sportSlug: sports.slug,
        slug: tournaments.slug,
        status: tournaments.status,
        createdBy: tournaments.createdBy,
        startsAt: tournaments.startsAt,
        endsAt: tournaments.endsAt,
        format: tournaments.format,
        officialBilling: tournaments.officialBilling,
        venue: tournaments.venue,
        categoryLabel: tournaments.categoryLabel,
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
        startsAt: m.startsAt,
        endsAt: m.endsAt,
        format: m.format,
        officialBilling: m.officialBilling,
        venue: m.venue,
        categoryLabel: m.categoryLabel,
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
    const byTournamentId = new Map<string, UnifiedTournamentRow>();
    const orphanRows: UnifiedTournamentRow[] = [];

    const upsert = (row: UnifiedTournamentRow) => {
      if (row.tournamentId == null) {
        orphanRows.push(row);
        return;
      }
      const existing = byTournamentId.get(row.tournamentId);
      if (!existing) {
        byTournamentId.set(row.tournamentId, row);
        return;
      }
      const preferNew =
        tournamentResultPriority(row.placement) >= tournamentResultPriority(existing.placement);
      byTournamentId.set(row.tournamentId, {
        ...existing,
        ...(preferNew ? row : {}),
        placement: preferNew ? row.placement : existing.placement,
        status: row.status ?? existing.status,
      });
    };

    for (const row of [...created, ...joined]) {
      upsert(row);
    }

    const officialMapped = officialRows.map((row) =>
      mapOfficialRow(row, row.tournamentId ? tournamentMeta.get(row.tournamentId) : undefined),
    );
    for (const result of officialMapped) {
      upsert(result);
    }

    merged = [...byTournamentId.values(), ...orphanRows];
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
  if (type && type !== "all") {
    merged = merged.filter((r) => {
      if (type === "official") return r.source === "official";
      if (type === "fun_match" || type === "recreational") return r.source === "fun_match";
      return true;
    });
  }

  if (status && status !== "all") {
    merged = merged.filter((r) => (r.status ?? "").toLowerCase() === status);
  }

  if (query.sportSlug) {
    merged = merged.filter((r) => r.sportSlug === query.sportSlug);
  }

  merged = sortRows(merged, sortBy, sortDir);

  // Persist schedule-derived statuses so player dashboard stays in sync with public pages.
  await Promise.all(
    merged.map(async (row) => {
      if (!row.tournamentId || !row.sportSlug || !row.slug) return;
      const synced = await syncTournamentStatusFromSchedule({
        id: row.tournamentId,
        sportSlug: row.sportSlug,
        slug: row.slug,
        status: row.status ?? "upcoming",
        startsAt: row.startsAtDate ?? null,
        endsAt: row.endsAtDate ?? null,
      });
      row.status = synced;
    }),
  );

  const total = merged.length;
  const offset = (page - 1) * pageSize;
  const slice = merged.slice(offset, offset + pageSize);
  const items = applyManageFlags(slice, userId, roles);

  return buildPaginatedResult(items, total, page, pageSize);
}

export async function listDistinctTournamentYears(
  userId: string,
  roles: AppRole[],
  sportSlug?: string,
): Promise<number[]> {
  const list = await listPlayerTournaments(userId, roles, {
    page: 1,
    pageSize: 500,
    scope: "all",
    type: "all",
    status: "all",
    sortBy: "year",
    sortDir: "desc",
    sportSlug,
  });
  const years = new Set(list.items.map((i) => i.year));
  return [...years].sort((a, b) => b - a);
}
