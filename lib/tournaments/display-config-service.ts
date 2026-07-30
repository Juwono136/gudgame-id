import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournaments } from "@/db/schema/tournaments";
import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import {
  buildTournamentSettings,
  getTournamentDisplayConfig,
  type TournamentDisplayConfig,
  type TournamentDisplayLayout,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";

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
};

export async function patchTournamentDisplayConfig(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
  patch: DisplayConfigPatch,
): Promise<TournamentDisplayConfig> {
  await assertTournamentManagePageAccess(tournament, userId, roles);

  if (!VALID_LAYOUTS.includes(patch.layout)) {
    throw new AppError("Invalid display layout", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const previous = getTournamentDisplayConfig(tournament);
  const rotationLayouts = (patch.rotationLayouts ?? []).filter((l) => VALID_LAYOUTS.includes(l));
  const autoRotate = patch.autoRotate ?? false;
  const interval = Math.min(120, Math.max(5, patch.rotationIntervalSec ?? 15));

  const displayConfig: TournamentDisplayConfig = {
    layout: autoRotate ? "rotation" : patch.layout,
    autoRotate,
    rotationIntervalSec: interval,
    rotationLayouts: rotationLayouts.length ? rotationLayouts : undefined,
    showUpcoming: true,
    showHighlights: true,
    brandTheme:
      patch.brandTheme !== undefined ? patch.brandTheme : previous.brandTheme,
  };

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

export function readDisplayConfigFromTournament(
  tournament: TournamentDetail,
): TournamentDisplayConfig {
  return getTournamentDisplayConfig(tournament);
}
