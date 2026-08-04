import "server-only";

import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { wikiEntities } from "@/db/schema/wiki";
import { getAdminUserStats } from "@/lib/admin/users/service";
import {
  formatPeriodLabel,
  mergeSeriesCountsForPeriod,
  normalizeBucketValue,
  resolveDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/admin/dashboard/time-buckets";
import type {
  AdminDashboardQueryInput,
  AdminDashboardRange,
} from "@/lib/validations/admin-dashboard";
import { getRoleLabel } from "@/lib/roles/constants";

export type AdminDashboardStats = {
  sportSlug: string;
  sportId: string;
  range: AdminDashboardRange;
  period: {
    from: string;
    to: string;
    label: string;
    bucketUnit: DashboardPeriod["bucketUnit"];
  };
  generatedAt: string;
  summary: {
    totalUsers: number;
    activeAccounts: number;
    loggedInLast24h: number;
    wikiTotal: number;
    wikiPublished: number;
    wikiDraft: number;
    newUsersInRange: number;
    newWikiInRange: number;
  };
  wikiByType: { type: string; label: string; count: number }[];
  usersByRole: { role: string; label: string; count: number }[];
  userSignups: { key: string; label: string; count: number }[];
  wikiActivity: { key: string; label: string; players: number; teams: number; gear: number }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }[];
  recentWiki: {
    id: string;
    displayName: string;
    entityType: string;
    status: string;
    createdAt: string;
  }[];
};

export async function getAdminDashboardStats(
  sportId: string,
  sportSlug: string,
  query: AdminDashboardQueryInput,
): Promise<AdminDashboardStats> {
  const db = getDb();
  const period = resolveDashboardPeriod(query.range, query.from, query.to);
  const { start, end, bucketUnit } = period;
  const userStats = await getAdminUserStats();

  const wikiConditions = sportId ? [eq(wikiEntities.sportId, sportId)] : [];

  const [wikiTotalRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .where(wikiConditions.length ? and(...wikiConditions) : undefined);

  const [wikiPublishedRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .where(
      wikiConditions.length
        ? and(...wikiConditions, eq(wikiEntities.status, "published"))
        : eq(wikiEntities.status, "published"),
    );

  const [wikiDraftRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .where(
      wikiConditions.length
        ? and(...wikiConditions, eq(wikiEntities.status, "draft"))
        : eq(wikiEntities.status, "draft"),
    );

  const [newUsersRow] = await db
    .select({ count: count() })
    .from(user)
    .where(and(gte(user.createdAt, start), lte(user.createdAt, end)));

  const [newWikiRow] = await db
    .select({ count: count() })
    .from(wikiEntities)
    .where(
      wikiConditions.length
        ? and(
            ...wikiConditions,
            gte(wikiEntities.createdAt, start),
            lte(wikiEntities.createdAt, end),
          )
        : and(gte(wikiEntities.createdAt, start), lte(wikiEntities.createdAt, end)),
    );

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [loggedInRow] = await db
    .select({ count: count() })
    .from(user)
    .where(and(eq(user.isActive, true), gte(user.lastLoginAt, oneDayAgo)));

  const wikiTypeRows = await db
    .select({
      entityType: wikiEntities.entityType,
      count: sql<number>`count(*)::int`,
    })
    .from(wikiEntities)
    .where(wikiConditions.length ? and(...wikiConditions) : undefined)
    .groupBy(wikiEntities.entityType);

  const wikiByType = wikiTypeRows.map((row) => ({
    type: row.entityType,
    label: row.entityType.charAt(0).toUpperCase() + row.entityType.slice(1),
    count: Number(row.count),
  }));

  const usersByRole = Object.entries(userStats.byRole).map(([role, roleCount]) => ({
    role,
    label: getRoleLabel(role as "player" | "host" | "partner" | "super_admin"),
    count: roleCount,
  }));

  const userDateBucket =
    bucketUnit === "month"
      ? sql`date_trunc('month', ${user.createdAt})`
      : sql`date_trunc('day', ${user.createdAt})`;

  const userSignupRows = await db
    .select({
      bucket: sql<string>`${userDateBucket}::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(user)
    .where(and(gte(user.createdAt, start), lte(user.createdAt, end)))
    .groupBy(userDateBucket);

  const userSignups = mergeSeriesCountsForPeriod(
    period,
    userSignupRows.map((r) => ({
      bucket: normalizeBucketValue(r.bucket, bucketUnit),
      count: Number(r.count),
    })),
  );

  const wikiDateBucket =
    bucketUnit === "month"
      ? sql`date_trunc('month', ${wikiEntities.createdAt})`
      : sql`date_trunc('day', ${wikiEntities.createdAt})`;

  const wikiActivityRows = await db
    .select({
      bucket: sql<string>`${wikiDateBucket}::text`,
      entityType: wikiEntities.entityType,
      count: sql<number>`count(*)::int`,
    })
    .from(wikiEntities)
    .where(
      wikiConditions.length
        ? and(
            ...wikiConditions,
            gte(wikiEntities.createdAt, start),
            lte(wikiEntities.createdAt, end),
          )
        : and(gte(wikiEntities.createdAt, start), lte(wikiEntities.createdAt, end)),
    )
    .groupBy(wikiDateBucket, wikiEntities.entityType);

  const wikiActivityMap = new Map<
    string,
    { players: number; teams: number; gear: number }
  >();

  for (const row of wikiActivityRows) {
    const key = normalizeBucketValue(row.bucket, bucketUnit);
    const entry = wikiActivityMap.get(key) ?? { players: 0, teams: 0, gear: 0 };
    const n = Number(row.count);
    if (row.entityType === "player") entry.players += n;
    else if (row.entityType === "team") entry.teams += n;
    else if (row.entityType === "gear") entry.gear += n;
    wikiActivityMap.set(key, entry);
  }

  const wikiActivity = mergeSeriesCountsForPeriod(period, []).map((point) => ({
    key: point.key,
    label: point.label,
    players: wikiActivityMap.get(point.key)?.players ?? 0,
    teams: wikiActivityMap.get(point.key)?.teams ?? 0,
    gear: wikiActivityMap.get(point.key)?.gear ?? 0,
  }));

  const recentUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(8);

  const recentWiki = await db
    .select({
      id: wikiEntities.id,
      displayName: wikiEntities.displayName,
      entityType: wikiEntities.entityType,
      status: wikiEntities.status,
      createdAt: wikiEntities.createdAt,
    })
    .from(wikiEntities)
    .where(wikiConditions.length ? and(...wikiConditions) : undefined)
    .orderBy(desc(wikiEntities.createdAt))
    .limit(8);

  return {
    sportSlug,
    sportId,
    range: period.range,
    period: {
      from: period.fromIso,
      to: period.toIso,
      label: formatPeriodLabel(period),
      bucketUnit: period.bucketUnit,
    },
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers: userStats.totalStaff,
      activeAccounts: userStats.activeAccounts,
      loggedInLast24h: Number(loggedInRow?.count ?? 0),
      wikiTotal: Number(wikiTotalRow?.count ?? 0),
      wikiPublished: Number(wikiPublishedRow?.count ?? 0),
      wikiDraft: Number(wikiDraftRow?.count ?? 0),
      newUsersInRange: Number(newUsersRow?.count ?? 0),
      newWikiInRange: Number(newWikiRow?.count ?? 0),
    },
    wikiByType,
    usersByRole,
    userSignups,
    wikiActivity,
    recentUsers: recentUsers.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
    })),
    recentWiki: recentWiki.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      entityType: r.entityType,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
