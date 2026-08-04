import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerLeagueMatches,
  partnerLeagueTeams,
  partnerLeagues,
  type PartnerLeagueMatchStatus,
  type PartnerLeagueStatus,
} from "@/db/schema/partner-leagues";
import { sports } from "@/db/schema/sports";
import { AppError } from "@/lib/errors";
import type {
  PartnerLeagueDetail,
  PartnerLeagueListItem,
  PartnerLeagueMatchView,
  PartnerLeagueOption,
  PartnerLeagueTeamView,
} from "@/lib/partners/league-types";
import {
  computeLeagueStandings,
  isPartnerLeagueLinkable,
} from "@/lib/partners/league-types";
import {
  toPartnerPagedResult,
  type PartnerLeaguesListQuery,
  type PartnerPagedResult,
} from "@/lib/partners/list-query";
import { PARTNER_LEAGUE_FIELD_LIMITS } from "@/lib/partners/league-field-limits";
import { cleanupPartnerLeagueBrandMedia } from "@/lib/partners/media-lifecycle";
import { resolvePartnerLeagueBrandUrl } from "@/lib/partners/resolve-league-brand";
import { toOffset } from "@/lib/pagination/constants";
import { sanitizeTournamentRichField } from "@/lib/tournaments/rich-text";
import { ensureUniqueWikiSlug, slugifyWikiName } from "@/lib/wiki/slug";

export type {
  PartnerLeagueDetail,
  PartnerLeagueListItem,
  PartnerLeagueMatchView,
  PartnerLeagueOption,
  PartnerLeagueStandingRow,
  PartnerLeagueTeamView,
} from "@/lib/partners/league-types";
export { computeLeagueStandings };

function normalizeOptionalRichText(
  value: string | null | undefined,
  max: number,
): string | null {
  if (value == null) return null;
  const sanitized = sanitizeTournamentRichField(value);
  if (!sanitized?.trim()) return null;
  return sanitized.slice(0, max);
}

function asStatus(raw: string): PartnerLeagueStatus {
  if (raw === "draft" || raw === "active" || raw === "completed" || raw === "archived") {
    return raw;
  }
  return "active";
}

function asMatchStatus(raw: string): PartnerLeagueMatchStatus {
  if (raw === "scheduled" || raw === "completed" || raw === "cancelled") return raw;
  return "scheduled";
}

async function assertPartnerOwnsLeague(partnerId: string, leagueId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: partnerLeagues.id })
    .from(partnerLeagues)
    .where(and(eq(partnerLeagues.id, leagueId), eq(partnerLeagues.partnerId, partnerId)))
    .limit(1);
  if (!row) {
    throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
  }
}

/**
 * Validate league ownership for tournament linking; returns null when unset.
 * `allowExistingLeagueId` keeps a previously linked draft/archived league on edit
 * without allowing new attachments to non-linkable seasons.
 */
export async function resolveOwnedPartnerLeagueId(
  partnerId: string,
  leagueId: string | null | undefined,
  options?: { allowExistingLeagueId?: string | null },
): Promise<string | null> {
  if (leagueId == null || !String(leagueId).trim()) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: partnerLeagues.id, status: partnerLeagues.status })
    .from(partnerLeagues)
    .where(and(eq(partnerLeagues.id, leagueId), eq(partnerLeagues.partnerId, partnerId)))
    .limit(1);
  if (!row) {
    throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  const keepingExisting =
    options?.allowExistingLeagueId != null && options.allowExistingLeagueId === row.id;
  if (!isPartnerLeagueLinkable(row.status) && !keepingExisting) {
    throw new AppError(
      "Only active or completed leagues can be linked to tournaments. Draft and archived leagues are not available.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }
  return row.id;
}

function buildLeagueConditions(
  partnerId: string,
  query: Pick<PartnerLeaguesListQuery, "search" | "status">,
): SQL[] {
  const conditions: SQL[] = [eq(partnerLeagues.partnerId, partnerId)];
  const search = query.search?.trim();
  if (search) {
    conditions.push(ilike(partnerLeagues.name, `%${search}%`));
  }
  if (query.status === "public") {
    conditions.push(inArray(partnerLeagues.status, ["active", "completed"]));
  } else if (query.status && query.status !== "all") {
    conditions.push(eq(partnerLeagues.status, query.status));
  }
  return conditions;
}

function leagueOrderBy(query: PartnerLeaguesListQuery) {
  const dir = query.sortDir === "asc" ? asc : desc;
  if (query.sortBy === "name") return dir(partnerLeagues.name);
  if (query.sortBy === "createdAt") return dir(partnerLeagues.createdAt);
  return dir(partnerLeagues.updatedAt);
}

export async function queryPartnerLeagues(
  partnerId: string,
  query: PartnerLeaguesListQuery,
): Promise<PartnerPagedResult<PartnerLeagueListItem>> {
  const db = getDb();
  const conditions = buildLeagueConditions(partnerId, query);
  const where = and(...conditions);
  const offset = toOffset(query.page, query.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(partnerLeagues)
    .where(where);

  const total = Number(totalRow?.value ?? 0);
  if (total === 0) {
    return toPartnerPagedResult([], 0, query.page, query.pageSize);
  }

  const rows = await db
    .select({
      id: partnerLeagues.id,
      partnerId: partnerLeagues.partnerId,
      sportId: partnerLeagues.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: partnerLeagues.slug,
      name: partnerLeagues.name,
      summary: partnerLeagues.summary,
      description: partnerLeagues.description,
      brandImageUrl: partnerLeagues.brandImageUrl,
      brandImageStorageKey: partnerLeagues.brandImageStorageKey,
      status: partnerLeagues.status,
      createdAt: partnerLeagues.createdAt,
      updatedAt: partnerLeagues.updatedAt,
      teamCount: sql<number>`(
        select count(*)::int from partner_league_teams t where t.league_id = ${partnerLeagues.id}
      )`,
      matchCount: sql<number>`(
        select count(*)::int from partner_league_matches m where m.league_id = ${partnerLeagues.id}
      )`,
    })
    .from(partnerLeagues)
    .innerJoin(sports, eq(partnerLeagues.sportId, sports.id))
    .where(where)
    .orderBy(leagueOrderBy(query))
    .limit(query.pageSize)
    .offset(offset);

  return toPartnerPagedResult(
    rows.map((row) => ({
      id: row.id,
      partnerId: row.partnerId,
      sportId: row.sportId,
      sportSlug: row.sportSlug,
      sportName: row.sportName,
      slug: row.slug,
      name: row.name,
      summary: row.summary ?? null,
      description: row.description ?? null,
      brandImageUrl: resolvePartnerLeagueBrandUrl(
        row.brandImageUrl,
        row.brandImageStorageKey,
      ),
      status: asStatus(row.status),
      teamCount: Number(row.teamCount) || 0,
      matchCount: Number(row.matchCount) || 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    query.page,
    query.pageSize,
  );
}

/**
 * Compact league list for pickers / filter chips (not directory pagination).
 * Defaults to public-linkable seasons (active + completed).
 */
export async function listPartnerLeagueOptions(
  partnerId: string,
  options?: { includeDraft?: boolean; limit?: number },
): Promise<PartnerLeagueOption[]> {
  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 200);
  const statusFilter = options?.includeDraft
    ? inArray(partnerLeagues.status, ["active", "completed", "draft"])
    : inArray(partnerLeagues.status, ["active", "completed"]);

  const rows = await db
    .select({
      id: partnerLeagues.id,
      name: partnerLeagues.name,
      slug: partnerLeagues.slug,
      status: partnerLeagues.status,
    })
    .from(partnerLeagues)
    .where(and(eq(partnerLeagues.partnerId, partnerId), statusFilter))
    .orderBy(asc(partnerLeagues.name))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: asStatus(row.status),
  }));
}

export async function listPartnerLeagues(partnerId: string): Promise<PartnerLeagueListItem[]> {
  const result = await queryPartnerLeagues(partnerId, {
    page: 1,
    pageSize: 50,
    status: "all",
    sortBy: "updatedAt",
    sortDir: "desc",
  });
  return result.items;
}

export async function listPartnerLeagueTeasers(
  partnerId: string,
  options?: { limit?: number },
): Promise<PartnerLeagueListItem[]> {
  const result = await queryPartnerLeagues(partnerId, {
    page: 1,
    pageSize: Math.min(Math.max(options?.limit ?? 6, 1), 20),
    status: "public",
    sortBy: "updatedAt",
    sortDir: "desc",
  });
  return result.items;
}

export async function countPartnerLeagues(
  partnerId: string,
  status: PartnerLeaguesListQuery["status"] = "all",
): Promise<number> {
  const result = await queryPartnerLeagues(partnerId, {
    page: 1,
    pageSize: 5,
    status,
    sortBy: "updatedAt",
    sortDir: "desc",
  });
  return result.total;
}

export async function createPartnerLeague(input: {
  partnerId: string;
  sportId: string;
  name: string;
  createdBy: string;
  status?: PartnerLeagueStatus;
  summary?: string | null;
  description?: string | null;
}): Promise<PartnerLeagueListItem> {
  const db = getDb();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new AppError("League name is required", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const baseSlug = slugifyWikiName(name) || "league";
  const slug = await ensureUniqueWikiSlug(baseSlug, async (candidate) => {
    const [existing] = await db
      .select({ id: partnerLeagues.id })
      .from(partnerLeagues)
      .where(
        and(eq(partnerLeagues.partnerId, input.partnerId), eq(partnerLeagues.slug, candidate)),
      )
      .limit(1);
    return Boolean(existing);
  });

  const [created] = await db
    .insert(partnerLeagues)
    .values({
      partnerId: input.partnerId,
      sportId: input.sportId,
      slug,
      name,
      summary: normalizeOptionalRichText(
        input.summary,
        PARTNER_LEAGUE_FIELD_LIMITS.summary,
      ),
      description: normalizeOptionalRichText(
        input.description,
        PARTNER_LEAGUE_FIELD_LIMITS.description,
      ),
      status: input.status ?? "active",
      settings: {},
      createdBy: input.createdBy,
    })
    .returning({ id: partnerLeagues.id });

  if (!created) {
    throw new AppError("Failed to create league", { code: "INTERNAL_ERROR", statusCode: 500 });
  }

  const list = await listPartnerLeagues(input.partnerId);
  const item = list.find((l) => l.id === created.id);
  if (!item) {
    throw new AppError("League created but not found", { code: "INTERNAL_ERROR", statusCode: 500 });
  }
  return item;
}

const leagueDetailSelect = {
  id: partnerLeagues.id,
  partnerId: partnerLeagues.partnerId,
  sportId: partnerLeagues.sportId,
  sportSlug: sports.slug,
  sportName: sports.name,
  slug: partnerLeagues.slug,
  name: partnerLeagues.name,
  summary: partnerLeagues.summary,
  description: partnerLeagues.description,
  brandImageUrl: partnerLeagues.brandImageUrl,
  brandImageStorageKey: partnerLeagues.brandImageStorageKey,
  status: partnerLeagues.status,
  settings: partnerLeagues.settings,
  createdAt: partnerLeagues.createdAt,
  updatedAt: partnerLeagues.updatedAt,
};

export async function getPartnerLeagueById(
  partnerId: string,
  leagueId: string,
): Promise<PartnerLeagueDetail | null> {
  const db = getDb();
  const [row] = await db
    .select(leagueDetailSelect)
    .from(partnerLeagues)
    .innerJoin(sports, eq(partnerLeagues.sportId, sports.id))
    .where(and(eq(partnerLeagues.id, leagueId), eq(partnerLeagues.partnerId, partnerId)))
    .limit(1);

  if (!row) return null;
  return hydrateLeagueDetail(row);
}

export async function getPartnerLeagueBySlug(
  partnerId: string,
  leagueSlug: string,
): Promise<PartnerLeagueDetail | null> {
  const db = getDb();
  const [row] = await db
    .select(leagueDetailSelect)
    .from(partnerLeagues)
    .innerJoin(sports, eq(partnerLeagues.sportId, sports.id))
    .where(and(eq(partnerLeagues.partnerId, partnerId), eq(partnerLeagues.slug, leagueSlug)))
    .limit(1);

  if (!row) return null;
  return hydrateLeagueDetail(row);
}

async function hydrateLeagueDetail(row: {
  id: string;
  partnerId: string;
  sportId: string;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  brandImageUrl: string | null;
  brandImageStorageKey: string | null;
  status: string;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Promise<PartnerLeagueDetail> {
  const db = getDb();
  const teamRows = await db
    .select({
      id: partnerLeagueTeams.id,
      name: partnerLeagueTeams.name,
      sortOrder: partnerLeagueTeams.sortOrder,
    })
    .from(partnerLeagueTeams)
    .where(eq(partnerLeagueTeams.leagueId, row.id))
    .orderBy(asc(partnerLeagueTeams.sortOrder), asc(partnerLeagueTeams.name));

  const teams: PartnerLeagueTeamView[] = teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    sortOrder: t.sortOrder,
  }));
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const matchRows = await db
    .select({
      id: partnerLeagueMatches.id,
      teamAId: partnerLeagueMatches.teamAId,
      teamBId: partnerLeagueMatches.teamBId,
      scoreA: partnerLeagueMatches.scoreA,
      scoreB: partnerLeagueMatches.scoreB,
      status: partnerLeagueMatches.status,
      playedAt: partnerLeagueMatches.playedAt,
      notes: partnerLeagueMatches.notes,
    })
    .from(partnerLeagueMatches)
    .where(eq(partnerLeagueMatches.leagueId, row.id))
    .orderBy(desc(partnerLeagueMatches.playedAt), desc(partnerLeagueMatches.createdAt));

  const matches: PartnerLeagueMatchView[] = matchRows.map((m) => ({
    id: m.id,
    teamAId: m.teamAId,
    teamAName: teamNameById.get(m.teamAId) ?? "Team A",
    teamBId: m.teamBId,
    teamBName: teamNameById.get(m.teamBId) ?? "Team B",
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    status: asMatchStatus(m.status),
    playedAt: m.playedAt?.toISOString() ?? null,
    notes: m.notes,
  }));

  const standings = computeLeagueStandings(teams, matches);

  return {
    id: row.id,
    partnerId: row.partnerId,
    sportId: row.sportId,
    sportSlug: row.sportSlug,
    sportName: row.sportName,
    slug: row.slug,
    name: row.name,
    summary: row.summary ?? null,
    description: row.description ?? null,
    brandImageUrl: resolvePartnerLeagueBrandUrl(
      row.brandImageUrl,
      row.brandImageStorageKey,
    ),
    brandImageStorageKey: row.brandImageStorageKey ?? null,
    status: asStatus(row.status),
    teamCount: teams.length,
    matchCount: matches.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    settings:
      row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : {},
    teams,
    matches,
    standings,
  };
}

export async function addPartnerLeagueTeam(input: {
  partnerId: string;
  leagueId: string;
  name: string;
}): Promise<PartnerLeagueTeamView> {
  await assertPartnerOwnsLeague(input.partnerId, input.leagueId);
  const name = input.name.trim();
  if (name.length < 1) {
    throw new AppError("Team name is required", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const db = getDb();
  const existing = await db
    .select({ sortOrder: partnerLeagueTeams.sortOrder })
    .from(partnerLeagueTeams)
    .where(eq(partnerLeagueTeams.leagueId, input.leagueId))
    .orderBy(desc(partnerLeagueTeams.sortOrder))
    .limit(1);
  const nextOrder = (existing[0]?.sortOrder ?? -1) + 1;

  try {
    const [created] = await db
      .insert(partnerLeagueTeams)
      .values({
        leagueId: input.leagueId,
        name,
        sortOrder: nextOrder,
      })
      .returning({
        id: partnerLeagueTeams.id,
        name: partnerLeagueTeams.name,
        sortOrder: partnerLeagueTeams.sortOrder,
      });

    if (!created) {
      throw new AppError("Failed to add team", { code: "INTERNAL_ERROR", statusCode: 500 });
    }
    return created;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("partner_league_teams_league_name_uidx")) {
      throw new AppError("A team with that name already exists", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    throw error;
  }
}

export async function createPartnerLeagueMatch(input: {
  partnerId: string;
  leagueId: string;
  teamAId: string;
  teamBId: string;
}): Promise<PartnerLeagueMatchView> {
  await assertPartnerOwnsLeague(input.partnerId, input.leagueId);
  if (input.teamAId === input.teamBId) {
    throw new AppError("Teams must be different", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const db = getDb();
  const teams = await db
    .select({
      id: partnerLeagueTeams.id,
      name: partnerLeagueTeams.name,
    })
    .from(partnerLeagueTeams)
    .where(eq(partnerLeagueTeams.leagueId, input.leagueId));

  const teamA = teams.find((t) => t.id === input.teamAId);
  const teamB = teams.find((t) => t.id === input.teamBId);
  if (!teamA || !teamB) {
    throw new AppError("Teams must belong to this league", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const [created] = await db
    .insert(partnerLeagueMatches)
    .values({
      leagueId: input.leagueId,
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      status: "scheduled",
    })
    .returning({
      id: partnerLeagueMatches.id,
      teamAId: partnerLeagueMatches.teamAId,
      teamBId: partnerLeagueMatches.teamBId,
      scoreA: partnerLeagueMatches.scoreA,
      scoreB: partnerLeagueMatches.scoreB,
      status: partnerLeagueMatches.status,
      playedAt: partnerLeagueMatches.playedAt,
      notes: partnerLeagueMatches.notes,
    });

  if (!created) {
    throw new AppError("Failed to create match", { code: "INTERNAL_ERROR", statusCode: 500 });
  }

  return {
    id: created.id,
    teamAId: created.teamAId,
    teamAName: teamA.name,
    teamBId: created.teamBId,
    teamBName: teamB.name,
    scoreA: created.scoreA,
    scoreB: created.scoreB,
    status: asMatchStatus(created.status),
    playedAt: created.playedAt?.toISOString() ?? null,
    notes: created.notes,
  };
}

export async function recordPartnerLeagueMatchScore(input: {
  partnerId: string;
  leagueId: string;
  matchId: string;
  scoreA: number;
  scoreB: number;
  recordedBy: string;
  notes?: string | null;
}): Promise<PartnerLeagueMatchView> {
  await assertPartnerOwnsLeague(input.partnerId, input.leagueId);

  if (
    !Number.isInteger(input.scoreA) ||
    !Number.isInteger(input.scoreB) ||
    input.scoreA < 0 ||
    input.scoreB < 0
  ) {
    throw new AppError("Scores must be non-negative integers", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: partnerLeagueMatches.id,
      teamAId: partnerLeagueMatches.teamAId,
      teamBId: partnerLeagueMatches.teamBId,
    })
    .from(partnerLeagueMatches)
    .where(
      and(
        eq(partnerLeagueMatches.id, input.matchId),
        eq(partnerLeagueMatches.leagueId, input.leagueId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const [updated] = await db
    .update(partnerLeagueMatches)
    .set({
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      status: "completed",
      playedAt: new Date(),
      recordedBy: input.recordedBy,
      notes: input.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(partnerLeagueMatches.id, input.matchId))
    .returning({
      id: partnerLeagueMatches.id,
      teamAId: partnerLeagueMatches.teamAId,
      teamBId: partnerLeagueMatches.teamBId,
      scoreA: partnerLeagueMatches.scoreA,
      scoreB: partnerLeagueMatches.scoreB,
      status: partnerLeagueMatches.status,
      playedAt: partnerLeagueMatches.playedAt,
      notes: partnerLeagueMatches.notes,
    });

  if (!updated) {
    throw new AppError("Failed to record score", { code: "INTERNAL_ERROR", statusCode: 500 });
  }

  const teams = await db
    .select({ id: partnerLeagueTeams.id, name: partnerLeagueTeams.name })
    .from(partnerLeagueTeams)
    .where(eq(partnerLeagueTeams.leagueId, input.leagueId));
  const nameById = new Map(teams.map((t) => [t.id, t.name]));

  await db
    .update(partnerLeagues)
    .set({ updatedAt: new Date() })
    .where(eq(partnerLeagues.id, input.leagueId));

  return {
    id: updated.id,
    teamAId: updated.teamAId,
    teamAName: nameById.get(updated.teamAId) ?? "Team A",
    teamBId: updated.teamBId,
    teamBName: nameById.get(updated.teamBId) ?? "Team B",
    scoreA: updated.scoreA,
    scoreB: updated.scoreB,
    status: asMatchStatus(updated.status),
    playedAt: updated.playedAt?.toISOString() ?? null,
    notes: updated.notes,
  };
}

export async function updatePartnerLeague(input: {
  partnerId: string;
  leagueId: string;
  name?: string;
  status?: PartnerLeagueStatus;
  summary?: string | null;
  description?: string | null;
}): Promise<PartnerLeagueDetail> {
  await assertPartnerOwnsLeague(input.partnerId, input.leagueId);
  const db = getDb();

  const patch: {
    name?: string;
    status?: PartnerLeagueStatus;
    summary?: string | null;
    description?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.name != null) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new AppError("League name is required", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    patch.name = name;
  }

  if (input.status != null) {
    patch.status = asStatus(input.status);
  }

  if (input.summary !== undefined) {
    patch.summary = normalizeOptionalRichText(
      input.summary,
      PARTNER_LEAGUE_FIELD_LIMITS.summary,
    );
  }

  if (input.description !== undefined) {
    patch.description = normalizeOptionalRichText(
      input.description,
      PARTNER_LEAGUE_FIELD_LIMITS.description,
    );
  }

  if (
    patch.name == null &&
    patch.status == null &&
    input.summary === undefined &&
    input.description === undefined
  ) {
    throw new AppError("No changes provided", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const [updated] = await db
    .update(partnerLeagues)
    .set(patch)
    .where(
      and(eq(partnerLeagues.id, input.leagueId), eq(partnerLeagues.partnerId, input.partnerId)),
    )
    .returning({ id: partnerLeagues.id });

  if (!updated) {
    throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const detail = await getPartnerLeagueById(input.partnerId, input.leagueId);
  if (!detail) {
    throw new AppError("League updated but not found", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }
  return detail;
}

export async function updatePartnerLeagueBrandImage(input: {
  partnerId: string;
  leagueId: string;
  brandImageUrl: string | null;
  brandImageStorageKey: string | null;
}): Promise<PartnerLeagueDetail> {
  await assertPartnerOwnsLeague(input.partnerId, input.leagueId);
  const db = getDb();

  const [updated] = await db
    .update(partnerLeagues)
    .set({
      brandImageUrl: input.brandImageUrl,
      brandImageStorageKey: input.brandImageStorageKey,
      updatedAt: new Date(),
    })
    .where(
      and(eq(partnerLeagues.id, input.leagueId), eq(partnerLeagues.partnerId, input.partnerId)),
    )
    .returning({ id: partnerLeagues.id });

  if (!updated) {
    throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const detail = await getPartnerLeagueById(input.partnerId, input.leagueId);
  if (!detail) {
    throw new AppError("League updated but not found", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }
  return detail;
}

/**
 * Hard-delete a league. Prefer archiving via updatePartnerLeague for soft removal.
 * Cascades teams/matches via DB FK.
 */
export async function deletePartnerLeague(input: {
  partnerId: string;
  leagueId: string;
}): Promise<void> {
  await assertPartnerOwnsLeague(input.partnerId, input.leagueId);
  const db = getDb();

  const [league] = await db
    .select({ status: partnerLeagues.status })
    .from(partnerLeagues)
    .where(
      and(eq(partnerLeagues.id, input.leagueId), eq(partnerLeagues.partnerId, input.partnerId)),
    )
    .limit(1);

  if (!league) {
    throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  // Active seasons with matches should be archived, not hard-deleted by accident.
  const [matchRow] = await db
    .select({ id: partnerLeagueMatches.id })
    .from(partnerLeagueMatches)
    .where(eq(partnerLeagueMatches.leagueId, input.leagueId))
    .limit(1);

  if (league.status === "active" && matchRow) {
    throw new AppError(
      "Archive or complete this league before deleting. Active leagues with matches cannot be permanently deleted.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  const [media] = await db
    .select({
      brandImageUrl: partnerLeagues.brandImageUrl,
      brandImageStorageKey: partnerLeagues.brandImageStorageKey,
    })
    .from(partnerLeagues)
    .where(
      and(eq(partnerLeagues.id, input.leagueId), eq(partnerLeagues.partnerId, input.partnerId)),
    )
    .limit(1);

  await db
    .delete(partnerLeagues)
    .where(
      and(eq(partnerLeagues.id, input.leagueId), eq(partnerLeagues.partnerId, input.partnerId)),
    );

  if (media) {
    await cleanupPartnerLeagueBrandMedia({
      partnerId: input.partnerId,
      leagueId: input.leagueId,
      keepKey: null,
      previousStorageKey: media.brandImageStorageKey,
      previousUrl: media.brandImageUrl,
    });
  }
}

