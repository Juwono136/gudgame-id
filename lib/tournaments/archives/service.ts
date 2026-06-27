import "server-only";

import { and, count, desc, eq, ilike, inArray, or, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
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
import { deriveStatsTier } from "@/lib/tournaments/stats/tier";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";

export async function archiveTournamentSnapshot(
  tournament: TournamentDetail,
  partial = false,
): Promise<string> {
  const db = getDb();
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
  const allMembers =
    teamIds.length > 0
      ? await db
          .select()
          .from(tournamentTeamMembers)
          .where(inArray(tournamentTeamMembers.teamId, teamIds))
      : [];

  const snapshot = {
    partial,
    tournament,
    teams,
    members: allMembers,
    registrations,
    bracketMatches,
    reclubMatches,
    archivedReason: partial ? "cancelled" : "completed",
  };

  const [created] = await db
    .insert(tournamentArchives)
    .values({
      tournamentId: tournament.id,
      createdByUserId: tournament.createdBy ?? "",
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
) {
  const db = getDb();
  const { page, pageSize, search, status, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(tournaments.createdBy, userId)];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
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
  }
  if (query.tournamentType && query.tournamentType !== "all") {
    conditions.push(eq(tournaments.tournamentType, query.tournamentType));
  }
  if (query.officialBilling && query.officialBilling !== "all") {
    conditions.push(eq(tournaments.officialBilling, query.officialBilling));
  }

  const whereClause = and(...conditions);
  const orderColumn =
    sortBy === "name"
      ? tournaments.name
      : sortBy === "updated"
        ? tournaments.updatedAt
        : tournaments.startsAt;

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
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
      sportSlug: sports.slug,
      sportName: sports.name,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(sortDir === "asc" ? asc(orderColumn) : desc(orderColumn))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: count() })
    .from(tournaments)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);

  return {
    items: rows.map((row) => ({
      ...row,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 0,
  };
}

export async function getTournamentArchiveByTournamentId(tournamentId: string, userId: string) {
  const [archive] = await getDb()
    .select()
    .from(tournamentArchives)
    .where(
      and(
        eq(tournamentArchives.tournamentId, tournamentId),
        eq(tournamentArchives.createdByUserId, userId),
      ),
    )
    .orderBy(desc(tournamentArchives.archivedAt))
    .limit(1);

  return archive ?? null;
}
