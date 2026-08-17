import "server-only";

import { and, count, desc, eq, ilike, inArray, isNull, or, asc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { sports } from "@/db/schema/sports";
import { tournamentArchives } from "@/db/schema/tournament-archives";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  buildTournamentAuditReport,
  type TournamentAuditReport,
} from "@/lib/tournaments/archives/audit-report";
import { deriveStatsTier } from "@/lib/tournaments/stats/tier";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";

const log = logger.child({ module: "tournament-archives" });

const memberDisplayNameSql = sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name}, ${partnerPlayers.fullName}, 'Player')`;

export type CreatorTournamentScope = "active" | "history" | "all";

export type CreatorTournamentCounts = {
  total: number;
  live: number;
  upcoming: number;
  draft: number;
  completed: number;
  cancelled: number;
};

function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function archiveTournamentSnapshot(
  tournament: TournamentDetail,
  partial = false,
): Promise<string> {
  const db = getDb();
  const ownerId = tournament.createdBy?.trim();
  if (!ownerId) {
    log.warn("Skipping archive — tournament has no creator", {
      tournamentId: tournament.id,
    });
    return "";
  }

  const [existing] = await db
    .select({ id: tournamentArchives.id })
    .from(tournamentArchives)
    .where(eq(tournamentArchives.tournamentId, tournament.id))
    .orderBy(desc(tournamentArchives.archivedAt))
    .limit(1);
  if (existing) return existing.id;

  const statsTier = deriveStatsTier({
    tournamentType: tournament.tournamentType,
    officialBilling: tournament.officialBilling,
  });

  const [teams, bracketMatches, reclubMatches, registrations] = await Promise.all([
    db.select().from(tournamentTeams).where(eq(tournamentTeams.tournamentId, tournament.id)),
    db
      .select()
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id)),
    db
      .select()
      .from(tournamentReclubMatches)
      .where(eq(tournamentReclubMatches.tournamentId, tournament.id)),
    db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournament.id)),
  ]);

  const teamIds = teams.map((t) => t.id);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const allMembers =
    teamIds.length > 0
      ? await db
          .select({
            id: tournamentTeamMembers.id,
            teamId: tournamentTeamMembers.teamId,
            userId: tournamentTeamMembers.userId,
            partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
            slotIndex: tournamentTeamMembers.slotIndex,
            role: tournamentTeamMembers.role,
            joinedAt: tournamentTeamMembers.joinedAt,
            displayName: memberDisplayNameSql,
          })
          .from(tournamentTeamMembers)
          .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
          .leftJoin(
            partnerPlayers,
            eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id),
          )
          .where(inArray(tournamentTeamMembers.teamId, teamIds))
      : [];

  const withTeamNames = <
    T extends {
      teamAId: string | null;
      teamBId: string | null;
      teamAName?: string | null;
      teamBName?: string | null;
    },
  >(
    match: T,
  ) => ({
    ...match,
    teamAName:
      match.teamAName?.trim() ||
      (match.teamAId ? teamNameById.get(match.teamAId) ?? null : null),
    teamBName:
      match.teamBName?.trim() ||
      (match.teamBId ? teamNameById.get(match.teamBId) ?? null : null),
  });

  const snapshot = {
    partial,
    tournament,
    teams,
    members: allMembers,
    registrations,
    bracketMatches: bracketMatches.map(withTeamNames),
    reclubMatches: reclubMatches.map(withTeamNames),
    archivedReason: partial ? "cancelled" : "completed",
  };

  const [created] = await db
    .insert(tournamentArchives)
    .values({
      tournamentId: tournament.id,
      createdByUserId: ownerId,
      statsTier,
      sportId: tournament.sportId,
      snapshot,
    })
    .returning({ id: tournamentArchives.id });

  return created?.id ?? "";
}

export async function listCreatorTournamentHistory(
  userId: string,
  query: TournamentsListQuery,
  sportId?: string,
  scope: CreatorTournamentScope = "all",
) {
  const db = getDb();
  const { page, pageSize, search, status, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(tournaments.createdBy, userId),
    isNull(tournaments.partnerId),
  ];

  if (sportId) {
    conditions.push(eq(tournaments.sportId, sportId));
  }

  if (search?.trim()) {
    const term = `%${escapeIlikePattern(search.trim())}%`;
    conditions.push(
      or(
        ilike(tournaments.name, term),
        ilike(tournaments.summary, term),
        ilike(tournaments.venue, term),
      )!,
    );
  }

  if (status && status !== "all") {
    conditions.push(eq(tournaments.status, status));
  } else if (scope === "active") {
    conditions.push(
      or(
        eq(tournaments.status, "live"),
        eq(tournaments.status, "upcoming"),
        eq(tournaments.status, "draft"),
      )!,
    );
  } else if (scope === "history") {
    conditions.push(
      or(eq(tournaments.status, "completed"), eq(tournaments.status, "cancelled"))!,
    );
  }

  if (query.tournamentType && query.tournamentType !== "all") {
    conditions.push(eq(tournaments.tournamentType, query.tournamentType));
  }
  if (query.officialBilling && query.officialBilling !== "all") {
    conditions.push(eq(tournaments.officialBilling, query.officialBilling));
  }
  if (query.format && query.format !== "all") {
    conditions.push(eq(tournaments.format, query.format));
  }

  const whereClause = and(...conditions);
  const orderColumn =
    sortBy === "name"
      ? tournaments.name
      : sortBy === "updated"
        ? tournaments.updatedAt
        : tournaments.startsAt;

  const [totalRow] = await db
    .select({ count: count() })
    .from(tournaments)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  const rows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      officialBilling: tournaments.officialBilling,
      format: tournaments.format,
      categoryLabel: tournaments.categoryLabel,
      venue: tournaments.venue,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
      sportSlug: sports.slug,
      sportName: sports.name,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(sortDir === "asc" ? asc(orderColumn) : desc(orderColumn), desc(tournaments.id))
    .limit(pageSize)
    .offset(safeOffset);

  return {
    items: rows.map((row) => ({
      ...row,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getCreatorTournamentCounts(
  userId: string,
  sportId?: string,
): Promise<CreatorTournamentCounts> {
  const db = getDb();
  const conditions = [
    eq(tournaments.createdBy, userId),
    isNull(tournaments.partnerId),
  ];
  if (sportId) conditions.push(eq(tournaments.sportId, sportId));

  const rows = await db
    .select({
      status: tournaments.status,
      count: count(),
    })
    .from(tournaments)
    .where(and(...conditions))
    .groupBy(tournaments.status);

  const counts: CreatorTournamentCounts = {
    total: 0,
    live: 0,
    upcoming: 0,
    draft: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    const n = Number(row.count ?? 0);
    counts.total += n;
    if (row.status === "live") counts.live = n;
    else if (row.status === "upcoming") counts.upcoming = n;
    else if (row.status === "draft") counts.draft = n;
    else if (row.status === "completed") counts.completed = n;
    else if (row.status === "cancelled") counts.cancelled = n;
  }

  return counts;
}

export async function getTournamentArchiveByTournamentId(tournamentId: string, userId: string) {
  const db = getDb();
  const [tournament] = await db
    .select({
      id: tournaments.id,
      createdBy: tournaments.createdBy,
      status: tournaments.status,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return null;
  if (tournament.createdBy !== userId) {
    throw new AppError("You do not have access to this record", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const [archive] = await db
    .select()
    .from(tournamentArchives)
    .where(eq(tournamentArchives.tournamentId, tournamentId))
    .orderBy(desc(tournamentArchives.archivedAt))
    .limit(1);

  return archive ?? null;
}

/**
 * Lazy-create a final event record when a completed/cancelled tournament
 * never archived (e.g. completed via schedule sync).
 */
export async function ensureTournamentArchiveForOwner(
  tournamentId: string,
  userId: string,
) {
  const existing = await getTournamentArchiveByTournamentId(tournamentId, userId);
  if (existing) return existing;

  const { getTournamentById } = await import("@/lib/tournaments/workspace/service");
  const detail = await getTournamentById(tournamentId);
  if (!detail) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (detail.createdBy !== userId) {
    throw new AppError("You do not have access to this record", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  if (detail.status !== "completed" && detail.status !== "cancelled") {
    throw new AppError("Final records are only available for completed or cancelled events", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  await archiveTournamentSnapshot(detail, detail.status === "cancelled");
  const created = await getTournamentArchiveByTournamentId(tournamentId, userId);
  if (!created) {
    throw new AppError("Could not create the final event record", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }
  return created;
}

export type TournamentArchiveHostView = {
  id: string;
  tournamentId: string;
  statsTier: string;
  archivedAt: Date;
  report: TournamentAuditReport;
};

/** Owner-facing final record — human report only (no raw snapshot payload). */
export async function getTournamentArchiveReportForOwner(
  tournamentId: string,
  userId: string,
): Promise<TournamentArchiveHostView> {
  const archive = await ensureTournamentArchiveForOwner(tournamentId, userId);
  try {
    return {
      id: archive.id,
      tournamentId: archive.tournamentId,
      statsTier: archive.statsTier,
      archivedAt: archive.archivedAt,
      report: buildTournamentAuditReport({
        snapshot: archive.snapshot,
        statsTier: archive.statsTier,
        archivedAt: archive.archivedAt,
      }),
    };
  } catch (error) {
    log.error("Failed to build tournament audit report", {
      tournamentId,
      archiveId: archive.id,
      error,
    });
    throw new AppError("Could not prepare the final event record", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }
}
