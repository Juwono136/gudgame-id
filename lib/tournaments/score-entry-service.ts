import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournaments } from "@/db/schema/tournaments";
import type { AppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import {
  buildTournamentSettings,
  getTournamentScoreEntryMode,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";

export type ScoreEntryMode = "live" | "paper";

export async function patchTournamentScoreEntryMode(
  tournament: TournamentDetail,
  userId: string,
  roles: AppRole[],
  scoreEntryMode: ScoreEntryMode,
): Promise<ScoreEntryMode> {
  const access = await assertTournamentManagePageAccess(tournament, userId, roles);
  if (!access.isOwner && !access.isPartnerMember) {
    throw new AppError("Only the organizer or partner staff can change score entry mode.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (scoreEntryMode !== "live" && scoreEntryMode !== "paper") {
    throw new AppError("Invalid score entry mode", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

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

  const nextSettings = buildTournamentSettings(existingSettings, { scoreEntryMode });

  await db
    .update(tournaments)
    .set({ settings: nextSettings, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

  return getTournamentScoreEntryMode({
    ...tournament,
    settings: nextSettings,
  });
}
