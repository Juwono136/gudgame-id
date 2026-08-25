import "server-only";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/db/client";
import { tournaments } from "@/db/schema/tournaments";
import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import {
  buildTournamentSettings,
  getTournamentDisplayConfig,
  MAX_DISPLAY_SPONSOR_BANNERS,
  type TournamentDisplayConfig,
  type TournamentDisplayLayout,
  type TournamentDisplaySponsorBanner,
} from "@/lib/tournaments/settings";
import { clampDisplayRotationIntervalSec } from "@/lib/tournaments/live/poll-intervals";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { deleteObject } from "@/lib/storage/client";

const VALID_LAYOUTS: TournamentDisplayLayout[] = [
  "single",
  "multi_court",
  "bracket",
  "leaderboard",
  "rotation",
];

export type DisplayConfigPatch = {
  layout: TournamentDisplayLayout;
  autoRotate?: boolean;
  rotationIntervalSec?: number;
  rotationLayouts?: TournamentDisplayLayout[];
  brandTheme?: TournamentDisplayConfig["brandTheme"];
  /** When provided, replaces the full sponsor list (order preserved). */
  sponsorBanners?: TournamentDisplaySponsorBanner[];
};

async function assertDisplayOrganizerAccess(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
) {
  const access = await assertTournamentManagePageAccess(tournament, userId, roles);
  if (!access.isOwner && !access.isPartnerMember) {
    throw new AppError("Only the organizer or partner staff can change display settings.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return access;
}

async function persistDisplayConfig(
  tournament: TournamentDetail,
  displayConfig: TournamentDisplayConfig,
): Promise<TournamentDisplayConfig> {
  const db = getDb();
  const [row] = await db
    .select({ settings: tournaments.settings })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  const existingSettings =
    (row?.settings as Record<string, unknown> | null) ??
    (tournament.settings && typeof tournament.settings === "object"
      ? (tournament.settings as Record<string, unknown>)
      : {});

  const nextSettings = buildTournamentSettings(existingSettings, { displayConfig });

  await db
    .update(tournaments)
    .set({ settings: nextSettings, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  return displayConfig;
}

export async function patchTournamentDisplayConfig(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
  patch: DisplayConfigPatch,
): Promise<TournamentDisplayConfig> {
  await assertDisplayOrganizerAccess(tournament, userId, roles);

  if (!VALID_LAYOUTS.includes(patch.layout)) {
    throw new AppError("Invalid display layout", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const previous = getTournamentDisplayConfig(tournament);
  const rotationLayouts = (patch.rotationLayouts ?? []).filter((l) => VALID_LAYOUTS.includes(l));
  const autoRotate = patch.autoRotate ?? false;
  const interval = clampDisplayRotationIntervalSec(patch.rotationIntervalSec);

  const displayConfig: TournamentDisplayConfig = {
    layout: autoRotate ? "rotation" : patch.layout,
    autoRotate,
    rotationIntervalSec: interval,
    rotationLayouts: rotationLayouts.length ? rotationLayouts : undefined,
    showUpcoming: true,
    showHighlights: true,
    brandTheme: patch.brandTheme !== undefined ? patch.brandTheme : previous.brandTheme,
    sponsorBanners:
      patch.sponsorBanners !== undefined
        ? patch.sponsorBanners.slice(0, MAX_DISPLAY_SPONSOR_BANNERS)
        : previous.sponsorBanners,
  };

  return persistDisplayConfig(tournament, displayConfig);
}

export async function appendTournamentSponsorBanner(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
  input: { imageUrl: string; storageKey: string; label?: string },
): Promise<TournamentDisplayConfig> {
  await assertDisplayOrganizerAccess(tournament, userId, roles);

  const previous = getTournamentDisplayConfig(tournament);
  const existing = previous.sponsorBanners ?? [];
  if (existing.length >= MAX_DISPLAY_SPONSOR_BANNERS) {
    throw new AppError(`Maximum ${MAX_DISPLAY_SPONSOR_BANNERS} sponsor banners allowed.`, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const banner: TournamentDisplaySponsorBanner = {
    id: randomUUID(),
    imageUrl: input.imageUrl,
    storageKey: input.storageKey,
    ...(input.label?.trim() ? { label: input.label.trim().slice(0, 80) } : {}),
  };

  return persistDisplayConfig(tournament, {
    ...previous,
    sponsorBanners: [...existing, banner],
  });
}

export async function removeTournamentSponsorBanner(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
  bannerId: string,
): Promise<TournamentDisplayConfig> {
  await assertDisplayOrganizerAccess(tournament, userId, roles);

  const previous = getTournamentDisplayConfig(tournament);
  const existing = previous.sponsorBanners ?? [];
  const target = existing.find((b) => b.id === bannerId);
  if (!target) {
    throw new AppError("Sponsor banner not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  try {
    await deleteObject(target.storageKey);
  } catch {
    /* best-effort storage cleanup */
  }

  const next = existing.filter((b) => b.id !== bannerId);
  return persistDisplayConfig(tournament, {
    ...previous,
    sponsorBanners: next.length ? next : undefined,
  });
}

export async function reorderTournamentSponsorBanners(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
  orderedIds: string[],
): Promise<TournamentDisplayConfig> {
  await assertDisplayOrganizerAccess(tournament, userId, roles);

  const previous = getTournamentDisplayConfig(tournament);
  const existing = previous.sponsorBanners ?? [];
  if (!existing.length) {
    return previous;
  }

  const byId = new Map(existing.map((b) => [b.id, b]));
  const next: TournamentDisplaySponsorBanner[] = [];
  for (const id of orderedIds) {
    const b = byId.get(id);
    if (b) {
      next.push(b);
      byId.delete(id);
    }
  }
  for (const leftover of byId.values()) {
    next.push(leftover);
  }

  return persistDisplayConfig(tournament, {
    ...previous,
    sponsorBanners: next,
  });
}

export function readDisplayConfigFromTournament(
  tournament: TournamentDetail,
): TournamentDisplayConfig {
  return getTournamentDisplayConfig(tournament);
}
