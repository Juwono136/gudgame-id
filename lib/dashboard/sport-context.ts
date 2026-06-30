import "server-only";

import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { sports } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { DASHBOARD_SPORT_COOKIE } from "@/lib/roles/constants";
import { filterSportCatalogSlugs } from "@/lib/sports/catalog";
import { ensureDefaultSports } from "@/lib/sports/ensure-default-sport";
import type { DashboardSportContext, DashboardSportOption } from "@/lib/dashboard/types";

export type { DashboardSportContext, DashboardSportOption };

async function listActiveSports(): Promise<DashboardSportOption[]> {
  const db = getDb();
  let rows = await db
    .select({ id: sports.id, slug: sports.slug, name: sports.name })
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(asc(sports.displayOrder));

  if (rows.length === 0) {
    await ensureDefaultSports();
    rows = await db
      .select({ id: sports.id, slug: sports.slug, name: sports.name })
      .from(sports)
      .where(eq(sports.isActive, true))
      .orderBy(asc(sports.displayOrder));
  }

  return rows;
}

export async function listDashboardSportsForUser(
  userId: string,
): Promise<DashboardSportOption[]> {
  const db = getDb();
  const [dbUser] = await db
    .select({ sportInterestSlugs: user.sportInterestSlugs })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const interests = filterSportCatalogSlugs(dbUser?.sportInterestSlugs ?? []);
  const activeSports = await listActiveSports();

  if (interests.length === 0) {
    return activeSports;
  }

  const bySlug = new Map(activeSports.map((sport) => [sport.slug, sport]));
  const ordered: DashboardSportOption[] = [];
  for (const slug of interests) {
    const sport = bySlug.get(slug);
    if (sport) ordered.push(sport);
  }
  return ordered;
}

export async function resolveDashboardSportContext(
  userId: string,
): Promise<DashboardSportContext> {
  const availableSports = await listDashboardSportsForUser(userId);

  if (availableSports.length === 0) {
    return { sportSlug: "padel", sportId: "", availableSports: [] };
  }

  const cookieStore = await cookies();
  const slugFromCookie = cookieStore.get(DASHBOARD_SPORT_COOKIE)?.value;
  const matched = slugFromCookie
    ? availableSports.find((sport) => sport.slug === slugFromCookie)
    : undefined;
  const selected = matched ?? availableSports[0]!;

  return {
    sportSlug: selected.slug,
    sportId: selected.id,
    availableSports,
  };
}

export async function requireDashboardSportContext(
  userId: string,
): Promise<DashboardSportContext & { sportId: string }> {
  const ctx = await resolveDashboardSportContext(userId);
  if (!ctx.sportId) {
    throw new AppError(
      "No sport available for your dashboard. Follow sports in Settings or ask an admin to enable disciplines.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }
  return ctx as DashboardSportContext & { sportId: string };
}

export async function assertDashboardSportSlugAllowed(
  userId: string,
  slug: string,
): Promise<DashboardSportOption> {
  const available = await listDashboardSportsForUser(userId);
  const sport = available.find((item) => item.slug === slug);
  if (!sport) {
    throw new AppError("Sport is not available for your dashboard", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return sport;
}

/** Keeps dashboard sport cookie valid after interests or provisioned sports change. */
export async function reconcileDashboardSportCookie(userId: string): Promise<void> {
  const available = await listDashboardSportsForUser(userId);
  if (available.length === 0) return;

  const cookieStore = await cookies();
  const current = cookieStore.get(DASHBOARD_SPORT_COOKIE)?.value;
  if (current && available.some((sport) => sport.slug === current)) return;

  cookieStore.set(DASHBOARD_SPORT_COOKIE, available[0]!.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
