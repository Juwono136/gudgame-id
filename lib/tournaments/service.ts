import "server-only";

import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partners } from "@/db/schema/partners";
import { sports } from "@/db/schema/sports";
import {
  tournaments,
  type OfficialBillingType,
  type TournamentStatus,
  type TournamentType,
} from "@/db/schema/tournaments";
import { isFunMatchType, normalizeTournamentType } from "@/lib/tournaments/core/types";
import { shouldProvisionBracketOnCreate } from "@/lib/tournaments/format-capabilities";
import { withCache } from "@/lib/cache/redis-cache";
import { AppError } from "@/lib/errors";
import {
  invalidateTournamentCaches,
  tournamentDetailCacheKey,
  tournamentListCacheKey,
} from "@/lib/tournaments/cache";
import {
  buildTournamentSettings,
  settingsInputFromUpsert,
} from "@/lib/tournaments/settings";
import {
  computeTournamentStatus,
  resolveStatusOnWrite,
  syncTournamentStatusFromSchedule,
} from "@/lib/tournaments/status-sync";
import { syncReclubParticipation } from "@/lib/tournaments/stats/sync";
import { resolveTournamentCoverUrl } from "@/lib/tournaments/resolve-cover";
import { deleteStoredObject, deleteStoredObjectIfReplaced } from "@/lib/storage/object-lifecycle";
import {
  coerceTournamentRichFields,
  sanitizeTournamentRichFields,
} from "@/lib/tournaments/rich-text";
import { slugifyWikiName } from "@/lib/wiki/slug";
import type {
  PublicTournamentsListQuery,
  TournamentUpsertInput,
  TournamentsListQuery,
} from "@/lib/validations/tournaments";

export type TournamentListItem = {
  id: string; sportId: string;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  summary: string | null;
  status: TournamentStatus;
  tournamentType: string;
  officialBilling: OfficialBillingType | null;
  venue: string | null;
  categoryLabel: string | null;
  registrationFeeIdr: number | null;
  prizePoolIdr?: number | null;
  coverImageUrl?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export type TournamentDetail = TournamentListItem & {
  description: string | null;
  rules: string | null;
  coverImageUrl: string | null;
  coverImageStorageKey: string | null;
  format: string;
  maxTeams: number | null;
  playersPerTeam: number;
  prizePoolIdr: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  createdBy: string | null;
  creatorName: string | null;
  creatorImage: string | null;
  settings: Record<string, unknown>;
  /** NULL = Gud Game; set = white-label partner event */
  partnerId: string | null;
  /** Public partner slug when partnerId is set (for white-label URLs). */
  partnerSlug: string | null;
};

export type TournamentsListResult = {
  items: TournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function mapListRow(row: {
  id: string; sportId: string;
  sportSlug: string;
  sportName: string;
  slug: string;
  name: string;
  summary: string | null;
  status: string;
  tournamentType: string;
  officialBilling?: string | null;
  venue: string | null;
  categoryLabel?: string | null;
  registrationFeeIdr?: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
}): TournamentListItem {
  const status = computeTournamentStatus(
    row.status as TournamentStatus,
    row.startsAt,
    row.endsAt,
  );
  return {
    id: row.id,
    sportId: row.sportId,
    sportSlug: row.sportSlug,
    sportName: row.sportName,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    status,
    tournamentType: normalizeTournamentType(row.tournamentType) as TournamentType,
    officialBilling: (row.officialBilling as OfficialBillingType | null) ?? null,
    venue: row.venue,
    categoryLabel: row.categoryLabel ?? null,
    registrationFeeIdr: row.registrationFeeIdr ?? null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sortColumn(sortBy: TournamentsListQuery["sortBy"]) {
  switch (sortBy) {
    case "name":
      return tournaments.name;
    case "updated":
      return tournaments.updatedAt;
    case "startsAt":
    default:
      return tournaments.startsAt;
  }
}

export async function listTournaments(
  sportId: string,
  query: TournamentsListQuery,
): Promise<TournamentsListResult> {
  const db = getDb();
  const { page, pageSize, search, status, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(tournaments.sportId, sportId), isNull(tournaments.partnerId)];
  if (query.createdBy) {
    conditions.push(eq(tournaments.createdBy, query.createdBy));
  }
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
  if (status !== "all") {
    conditions.push(eq(tournaments.status, status));
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
  if (query.category && query.category !== "all") {
    conditions.push(eq(tournaments.categoryLabel, query.category));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(tournaments)
    .where(whereClause);

  const total = Number(totalRow?.count ?? 0);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      officialBilling: tournaments.officialBilling,
      venue: tournaments.venue,
      categoryLabel: tournaments.categoryLabel,
      registrationFeeIdr: tournaments.registrationFeeIdr,
      coverImageUrl: tournaments.coverImageUrl,
      coverImageStorageKey: tournaments.coverImageStorageKey,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn(sortBy)), desc(tournaments.id))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map((row) => ({
      ...mapListRow(row),
      coverImageUrl: resolveTournamentCoverUrl(row.coverImageUrl, row.coverImageStorageKey),
    })),
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function listPublicTournamentsBySport(
  sportSlug: string,
  bucket: "upcoming" | "live" | "past",
  limit = 12,
): Promise<TournamentListItem[]> {
  return withCache(
    tournamentListCacheKey(sportSlug, bucket, limit),
    async () => {
      const db = getDb();

      const rows = await db
        .select({
          id: tournaments.id,
          sportId: tournaments.sportId,
          sportSlug: sports.slug,
          sportName: sports.name,
          slug: tournaments.slug,
          name: tournaments.name,
          summary: tournaments.summary,
          status: tournaments.status,
          tournamentType: tournaments.tournamentType,
          venue: tournaments.venue,
          categoryLabel: tournaments.categoryLabel,
          registrationFeeIdr: tournaments.registrationFeeIdr,
          startsAt: tournaments.startsAt,
          endsAt: tournaments.endsAt,
          updatedAt: tournaments.updatedAt,
        })
        .from(tournaments)
        .innerJoin(sports, eq(tournaments.sportId, sports.id))
        .where(
          and(
            eq(sports.slug, sportSlug),
            eq(sports.isActive, true),
            isNull(tournaments.partnerId),
            or(
              eq(tournaments.status, "live"),
              eq(tournaments.status, "upcoming"),
              eq(tournaments.status, "completed"),
              eq(tournaments.status, "cancelled"),
            )!,
          ),
        )
        .orderBy(desc(tournaments.startsAt))
        .limit(limit * 4);

      const bucketed = rows
        .map((row) => ({
          ...mapListRow(row),
          prizePoolIdr: null,
          coverImageUrl: null,
        }))
        .filter((item) => {
          if (bucket === "live") return item.status === "live";
          if (bucket === "upcoming") return item.status === "upcoming";
          return item.status === "completed" || item.status === "cancelled";
        });

      return bucketed.slice(0, limit);
    },
    { prefix: "tournaments", ttlSeconds: 30 },
  );
}

export async function listPublicTournamentsPaginated(
  sportSlug: string,
  query: PublicTournamentsListQuery,
): Promise<TournamentsListResult> {
  const db = getDb();
  const { page, pageSize, search, status, sortBy, sortDir, bucket, type } = query;

  const conditions = [
    eq(sports.slug, sportSlug),
    eq(sports.isActive, true),
    isNull(tournaments.partnerId),
  ];

  if (status !== "all" && bucket === "all") {
    conditions.push(eq(tournaments.status, status));
  } else {
    conditions.push(
      or(
        eq(tournaments.status, "live"),
        eq(tournaments.status, "upcoming"),
        eq(tournaments.status, "completed"),
        eq(tournaments.status, "cancelled"),
      )!,
    );
  }

  if (type !== "all") {
    const normalizedType = type === "recreational" ? "fun_match" : type;
    conditions.push(eq(tournaments.tournamentType, normalizedType));
  }
  if (query.officialBilling && query.officialBilling !== "all") {
    conditions.push(eq(tournaments.officialBilling, query.officialBilling));
  }
  if (query.format && query.format !== "all") {
    conditions.push(eq(tournaments.format, query.format));
  }
  if (query.category && query.category !== "all") {
    conditions.push(eq(tournaments.categoryLabel, query.category));
  }

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(tournaments.name, term),
        ilike(tournaments.summary, term),
        ilike(tournaments.venue, term),
        ilike(tournaments.categoryLabel, term),
      )!,
    );
  }

  const whereClause = and(...conditions);
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      officialBilling: tournaments.officialBilling,
      venue: tournaments.venue,
      categoryLabel: tournaments.categoryLabel,
      registrationFeeIdr: tournaments.registrationFeeIdr,
      prizePoolIdr: tournaments.prizePoolIdr,
      coverImageUrl: tournaments.coverImageUrl,
      coverImageStorageKey: tournaments.coverImageStorageKey,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn(sortBy)))
    .limit(500);

  let items = rows.map((row) => ({
    ...mapListRow(row),
    prizePoolIdr: row.prizePoolIdr,
    coverImageUrl: resolveTournamentCoverUrl(row.coverImageUrl, row.coverImageStorageKey),
  }));

  if (bucket === "live") {
    items = items.filter((item) => item.status === "live");
  } else if (bucket === "upcoming") {
    items = items.filter((item) => item.status === "upcoming");
  } else if (bucket === "past") {
    items = items.filter(
      (item) => item.status === "completed" || item.status === "cancelled",
    );
  } else if (status !== "all") {
    items = items.filter((item) => item.status === status);
  } else {
    items = items.filter(
      (item) =>
        item.status === "live" ||
        item.status === "upcoming" ||
        item.status === "completed",
    );
  }

  const total = items.length;
  const offset = (page - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  return {
    items: pageItems,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

const tournamentListSelect = {
  id: tournaments.id,
  sportId: tournaments.sportId,
  sportSlug: sports.slug,
  sportName: sports.name,
  slug: tournaments.slug,
  name: tournaments.name,
  summary: tournaments.summary,
  status: tournaments.status,
  tournamentType: tournaments.tournamentType,
  officialBilling: tournaments.officialBilling,
  venue: tournaments.venue,
  categoryLabel: tournaments.categoryLabel,
  registrationFeeIdr: tournaments.registrationFeeIdr,
  startsAt: tournaments.startsAt,
  endsAt: tournaments.endsAt,
  updatedAt: tournaments.updatedAt,
};

export async function getTournamentBySlug(
  sportSlug: string,
  slug: string,
): Promise<TournamentDetail | null> {
  // Gud Game tenant first. Fall back to any tenant so partner manage/live APIs
  // (shared /api/tournaments/... paths) keep working. Gud Game listings and
  // career surfaces must still filter isNull(partnerId) separately.
  const gud = await getTournamentBySlugScoped(sportSlug, slug, {});
  if (gud) return gud;
  return getTournamentBySlugScoped(sportSlug, slug, { anyTenant: true });
}

export async function getPartnerTournamentBySlug(
  partnerId: string,
  sportSlug: string,
  slug: string,
): Promise<TournamentDetail | null> {
  return getTournamentBySlugScoped(sportSlug, slug, { partnerId });
}

/** Manage/API lookup — finds Gud Game or partner tournament by sport+slug. */
export async function getTournamentBySlugForManage(
  sportSlug: string,
  slug: string,
): Promise<TournamentDetail | null> {
  return getTournamentBySlugScoped(sportSlug, slug, { anyTenant: true });
}

async function getTournamentBySlugScoped(
  sportSlug: string,
  slug: string,
  scope: { partnerId?: string; anyTenant?: boolean },
): Promise<TournamentDetail | null> {
  const conditions = [eq(sports.slug, sportSlug), eq(tournaments.slug, slug)];
  if (scope.partnerId) {
    conditions.push(eq(tournaments.partnerId, scope.partnerId));
  } else if (!scope.anyTenant) {
    conditions.push(isNull(tournaments.partnerId));
  }

  const [row] = await getDb()
    .select({
      ...tournamentListSelect,
      description: tournaments.description,
      rules: tournaments.rules,
      coverImageUrl: tournaments.coverImageUrl,
      coverImageStorageKey: tournaments.coverImageStorageKey,
      format: tournaments.format,
      maxTeams: tournaments.maxTeams,
      playersPerTeam: tournaments.playersPerTeam,
      prizePoolIdr: tournaments.prizePoolIdr,
      registrationOpensAt: tournaments.registrationOpensAt,
      registrationClosesAt: tournaments.registrationClosesAt,
      createdBy: tournaments.createdBy,
      creatorName: user.name,
      creatorImage: user.image,
      settings: tournaments.settings,
      partnerId: tournaments.partnerId,
      partnerSlug: partners.slug,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(user, eq(tournaments.createdBy, user.id))
    .leftJoin(partners, eq(tournaments.partnerId, partners.id))
    .where(and(...conditions))
    .limit(1);

  if (!row) return null;

  const syncedStatus = await syncTournamentStatusFromSchedule({
    id: row.id,
    sportSlug: row.sportSlug,
    slug: row.slug,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  });

  const rich = coerceTournamentRichFields({
    summary: row.summary,
    description: row.description,
    rules: row.rules,
  });

  return {
    ...mapListRow({ ...row, status: syncedStatus, summary: rich.summary }),
    description: rich.description,
    rules: rich.rules,
    coverImageUrl: resolveTournamentCoverUrl(row.coverImageUrl, row.coverImageStorageKey),
    coverImageStorageKey: row.coverImageStorageKey,
    format: row.format,
    maxTeams: row.maxTeams,
    playersPerTeam: row.playersPerTeam ?? 2,
    prizePoolIdr: row.prizePoolIdr,
    registrationOpensAt: row.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: row.registrationClosesAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    creatorName: row.creatorName ?? null,
    creatorImage: row.creatorImage ?? null,
    settings: (row.settings as Record<string, unknown>) ?? {},
    partnerId: row.partnerId ?? null,
    partnerSlug: row.partnerSlug ?? null,
  };
}

async function ensureUniqueSlug(
  sportId: string,
  baseSlug: string,
  excludeId?: string,
  partnerId?: string | null,
) {
  let slug = baseSlug;
  let n = 0;
  while (true) {
    const scope = partnerId
      ? and(
          eq(tournaments.sportId, sportId),
          eq(tournaments.slug, slug),
          eq(tournaments.partnerId, partnerId),
        )
      : and(
          eq(tournaments.sportId, sportId),
          eq(tournaments.slug, slug),
          isNull(tournaments.partnerId),
        );
    const [existing] = await getDb()
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(scope)
      .limit(1);
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
}

function parseOptionalDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createTournament(
  sportId: string,
  userId: string,
  input: TournamentUpsertInput,
  options?: { partnerId?: string | null },
): Promise<TournamentDetail> {
  const partnerId = options?.partnerId ?? null;
  const allowPartnerBilling = Boolean(partnerId);
  const allowOfficialBilling = input.tournamentType === "official";
  const allowBilling = allowOfficialBilling || allowPartnerBilling;

  const resolveBilling = () => {
    if (!allowBilling) {
      return { officialBilling: null as string | null, registrationFeeIdr: null as number | null };
    }
    const officialBilling = input.officialBilling ?? (allowPartnerBilling ? "free" : null);
    if (officialBilling === "paid") {
      return {
        officialBilling,
        registrationFeeIdr: input.registrationFeeIdr ?? null,
      };
    }
    if (officialBilling === "free") {
      return { officialBilling, registrationFeeIdr: 0 };
    }
    return { officialBilling: null, registrationFeeIdr: null };
  };
  const billing = resolveBilling();
  const baseSlug = input.slug?.trim() || slugifyWikiName(input.name);
  const slug = await ensureUniqueSlug(sportId, baseSlug, undefined, partnerId);
  const startsAt = parseOptionalDate(input.startsAt);
  const endsAt = parseOptionalDate(input.endsAt);
  const status = resolveStatusOnWrite(input.status, startsAt, endsAt);
  const rich = sanitizeTournamentRichFields({
    summary: input.summary,
    description: input.description,
    rules: input.rules,
    eligibilityRules: input.eligibilityRules,
    matchFormatRules: input.matchFormatRules,
    equipmentStandardsRules: input.equipmentStandardsRules,
  });

  const sportSlugRow = await getDb()
    .select({ slug: sports.slug })
    .from(sports)
    .where(eq(sports.id, sportId))
    .limit(1);
  const sportSlug = sportSlugRow[0]?.slug ?? "padel";

  const [created] = await getDb()
    .insert(tournaments)
    .values({
      sportId,
      slug,
      name: input.name,
      summary: rich.summary,
      description: rich.description,
      status,
      tournamentType: input.tournamentType,
      officialBilling: billing.officialBilling,
      format: input.format,
      categoryLabel: input.categoryLabel || null,
      rules: rich.matchFormatRules || rich.rules,
      venue: input.venue || null,
      maxTeams: input.maxTeams ?? null,
      playersPerTeam: input.playersPerTeam,
      registrationFeeIdr: billing.registrationFeeIdr,
      prizePoolIdr:
        input.tournamentType === "official" && input.officialBilling === "free"
          ? (input.prizePoolIdr ?? null)
          : input.prizePoolIdr ?? null,
      registrationOpensAt: parseOptionalDate(input.registrationOpensAt),
      registrationClosesAt:
        parseOptionalDate(input.registrationClosesAt) ??
        (partnerId ? endsAt : startsAt),
      startsAt,
      endsAt,
      coverImageUrl: input.coverImageStorageKey
        ? null
        : input.coverImageUrl?.trim() || null,
      coverImageStorageKey: input.coverImageStorageKey?.trim() || null,
      settings: buildTournamentSettings(
        undefined,
        settingsInputFromUpsert(
          {
            ...input,
            eligibilityRules: rich.eligibilityRules ?? undefined,
            matchFormatRules: rich.matchFormatRules ?? undefined,
            equipmentStandardsRules: rich.equipmentStandardsRules ?? undefined,
            rules: rich.rules ?? undefined,
          },
          sportSlug,
        ),
      ),
      createdBy: userId,
      partnerId,
    })
    .returning();

  if (!created) {
    throw new AppError("Failed to create tournament", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  const sportSlugForDetail = (
    await getDb().select({ slug: sports.slug }).from(sports).where(eq(sports.id, sportId)).limit(1)
  )[0]!.slug;

  const detail = partnerId
    ? await getPartnerTournamentBySlug(partnerId, sportSlugForDetail, created.slug)
    : await getTournamentBySlug(sportSlugForDetail, created.slug);

  if (!detail) {
    throw new AppError("Tournament created but not found", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  if (isFunMatchType(detail.tournamentType)) {
    await syncReclubParticipation({ tournament: detail, userId, role: "organizer" });
  }

  const { provisionTournamentCourts } = await import("@/lib/tournaments/courts/service");
  await provisionTournamentCourts(detail);

  if (shouldProvisionBracketOnCreate(detail.format)) {
    const { ensureBracketStructure } = await import(
      "@/lib/tournaments/brackets/provision-structure"
    );
    await ensureBracketStructure(detail);
  }

  await invalidateTournamentCaches(detail.sportSlug, detail.slug);
  return detail;
}

export async function getTournamentStats(sportId: string, createdBy?: string) {
  const conditions = [eq(tournaments.sportId, sportId)];
  if (createdBy) {
    conditions.push(eq(tournaments.createdBy, createdBy));
  }

  const rows = await getDb()
    .select({
      status: tournaments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tournaments)
    .where(and(...conditions))
    .groupBy(tournaments.status);

  const totals = {
    total: 0,
    upcoming: 0,
    live: 0,
    completed: 0,
    draft: 0,
  };

  for (const row of rows) {
    const n = Number(row.count);
    totals.total += n;
    if (row.status === "upcoming") totals.upcoming += n;
    if (row.status === "live") totals.live += n;
    if (row.status === "completed") totals.completed += n;
    if (row.status === "draft") totals.draft += n;
  }

  return totals;
}

export async function updateTournament(
  id: string,
  sportId: string,
  input: TournamentUpsertInput,
): Promise<TournamentDetail> {
  const [current] = await getDb()
    .select({
      coverImageStorageKey: tournaments.coverImageStorageKey,
      settings: tournaments.settings,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      officialBilling: tournaments.officialBilling,
      registrationOpensAt: tournaments.registrationOpensAt,
      registrationClosesAt: tournaments.registrationClosesAt,
      partnerId: tournaments.partnerId,
    })
    .from(tournaments)
    .where(and(eq(tournaments.id, id), eq(tournaments.sportId, sportId)))
    .limit(1);

  if (!current) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const baseSlug = input.slug?.trim() || slugifyWikiName(input.name);
  const slug = await ensureUniqueSlug(sportId, baseSlug, id, current.partnerId);

  const nextCoverKey = input.coverImageStorageKey?.trim() || null;
  await deleteStoredObjectIfReplaced(current.coverImageStorageKey, nextCoverKey);

  const startsAt = parseOptionalDate(input.startsAt);
  const endsAt = parseOptionalDate(input.endsAt);
  const status = resolveStatusOnWrite(input.status, startsAt, endsAt);

  if (
    input.format === "double_stage" &&
    status === "live" &&
    current.status !== "live"
  ) {
    const { listConfirmedOfficialTeamIds } = await import(
      "@/lib/tournaments/registration/official-roster"
    );
    const billing =
      input.tournamentType === "official"
        ? (input.officialBilling ?? current.officialBilling)
        : null;
    const confirmed = await listConfirmedOfficialTeamIds(id, billing);
    if (confirmed.size < 2) {
      throw new AppError(
        "Need at least 2 confirmed teams before this double stage tournament can go live. Add teams or adjust the schedule.",
        { code: "VALIDATION_ERROR", statusCode: 422 },
      );
    }
  }

  const scheduleLocked =
    (current.tournamentType === "official" || Boolean(current.partnerId)) &&
    (current.status === "live" || current.status === "completed");

  const registrationOpensAt = scheduleLocked
    ? current.registrationOpensAt
    : parseOptionalDate(input.registrationOpensAt);
  const registrationClosesAt = scheduleLocked
    ? current.registrationClosesAt
    : (parseOptionalDate(input.registrationClosesAt) ??
      (current.partnerId ? endsAt : startsAt));

  const allowPartnerBilling = Boolean(current.partnerId);
  const allowOfficialBilling = input.tournamentType === "official";
  const allowBilling = allowOfficialBilling || allowPartnerBilling;
  let nextOfficialBilling: string | null = null;
  let nextRegistrationFeeIdr: number | null = null;
  if (allowBilling) {
    nextOfficialBilling =
      input.officialBilling ?? (allowPartnerBilling ? "free" : null);
    if (nextOfficialBilling === "paid") {
      nextRegistrationFeeIdr = input.registrationFeeIdr ?? null;
    } else if (nextOfficialBilling === "free") {
      nextRegistrationFeeIdr = 0;
    }
  }

  const rich = sanitizeTournamentRichFields({
    summary: input.summary,
    description: input.description,
    rules: input.rules,
    eligibilityRules: input.eligibilityRules,
    matchFormatRules: input.matchFormatRules,
    equipmentStandardsRules: input.equipmentStandardsRules,
  });

  const sportSlugRow = await getDb()
    .select({ slug: sports.slug })
    .from(sports)
    .where(eq(sports.id, sportId))
    .limit(1);
  const sportSlugForSettings = sportSlugRow[0]?.slug ?? "padel";

  const [updated] = await getDb()
    .update(tournaments)
    .set({
      slug,
      name: input.name,
      summary: rich.summary,
      description: rich.description,
      status,
      tournamentType: input.tournamentType,
      officialBilling: nextOfficialBilling,
      format: input.format,
      categoryLabel: input.categoryLabel || null,
      rules: rich.matchFormatRules || rich.rules,
      venue: input.venue || null,
      maxTeams: input.maxTeams ?? null,
      playersPerTeam: input.playersPerTeam,
      registrationFeeIdr: nextRegistrationFeeIdr,
      prizePoolIdr:
        input.tournamentType === "official" && input.officialBilling === "free"
          ? (input.prizePoolIdr ?? null)
          : input.prizePoolIdr ?? null,
      registrationOpensAt,
      registrationClosesAt,
      startsAt,
      endsAt,
      coverImageUrl: nextCoverKey ? null : input.coverImageUrl?.trim() || null,
      coverImageStorageKey: nextCoverKey,
      settings: buildTournamentSettings(
        (current?.settings as Record<string, unknown>) ?? undefined,
        settingsInputFromUpsert(
          {
            ...input,
            eligibilityRules: rich.eligibilityRules ?? undefined,
            matchFormatRules: rich.matchFormatRules ?? undefined,
            equipmentStandardsRules: rich.equipmentStandardsRules ?? undefined,
            rules: rich.rules ?? undefined,
          },
          sportSlugForSettings,
        ),
      ),
    })
    .where(and(eq(tournaments.id, id), eq(tournaments.sportId, sportId)))
    .returning();

  if (!updated) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const sportSlug = (
    await getDb().select({ slug: sports.slug }).from(sports).where(eq(sports.id, sportId)).limit(1)
  )[0]?.slug;

  const detail = sportSlug ? await getTournamentBySlug(sportSlug, updated.slug) : null;
  if (!detail) {
    throw new AppError("Tournament updated but not found", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  if (
    (status === "completed" || status === "cancelled") &&
    current?.status !== status
  ) {
    const { finalizeStaleActiveMatches } = await import(
      "@/lib/tournaments/lifecycle/finalize-active-matches"
    );
    await finalizeStaleActiveMatches(
      id,
      status === "cancelled" ? "cancelled" : "completed",
    );

    const { archiveTournamentSnapshot } = await import(
      "@/lib/tournaments/archives/service"
    );
    await archiveTournamentSnapshot(detail, status === "cancelled");
  }

  const { provisionTournamentCourts } = await import("@/lib/tournaments/courts/service");
  await provisionTournamentCourts(detail);

  if (shouldProvisionBracketOnCreate(detail.format)) {
    const { ensureBracketStructure } = await import(
      "@/lib/tournaments/brackets/provision-structure"
    );
    await ensureBracketStructure(detail);
  }

  if (
    detail.format === "double_stage" &&
    detail.status === "live" &&
    current?.status !== "live"
  ) {
    const { initializeDoubleStageGroups } = await import(
      "@/lib/tournaments/double-stage/service"
    );
    await initializeDoubleStageGroups(detail, { requireTeams: true });
  }

  await invalidateTournamentCaches(detail.sportSlug, detail.slug);
  return detail;
}

export async function deleteTournament(id: string, sportId: string): Promise<void> {
  const [existing] = await getDb()
    .select({
      slug: tournaments.slug,
      sportSlug: sports.slug,
      coverImageStorageKey: tournaments.coverImageStorageKey,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(eq(tournaments.id, id), eq(tournaments.sportId, sportId)))
    .limit(1);

  const result = await getDb()
    .delete(tournaments)
    .where(and(eq(tournaments.id, id), eq(tournaments.sportId, sportId)))
    .returning({ id: tournaments.id });

  if (!result.length) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (existing?.coverImageStorageKey) {
    await deleteStoredObject(existing.coverImageStorageKey);
  }

  if (existing) {
    await invalidateTournamentCaches(existing.sportSlug, existing.slug);
  }
}

export async function countTournamentsForSport(sportId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(tournaments)
    .where(eq(tournaments.sportId, sportId));
  return Number(row?.count ?? 0);
}
