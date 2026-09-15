import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema";
import { DEFAULT_SPORT_SEEDS } from "@/lib/sports/default-sport-data";
import { DEFAULT_SPORT_TOURNAMENT_CONFIG } from "@/db/schema/sports";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "sports", action: "ensure-default" });

/**
 * Ensures MVP sports exist and are active. Safe to call on every request that
 * depends on a default sport (player profiles, admin wiki, tournaments).
 */
export async function ensureDefaultSports(): Promise<void> {
  const db = getDb();

  for (const sport of DEFAULT_SPORT_SEEDS) {
    const [existing] = await db
      .select({ id: sports.id })
      .from(sports)
      .where(eq(sports.slug, sport.slug))
      .limit(1);

    if (existing) {
      await db
        .update(sports)
        .set({
          visibility: sport.visibility,
          tagline: sport.tagline,
          description: sport.description,
          tournamentConfig: sport.tournamentConfig ?? DEFAULT_SPORT_TOURNAMENT_CONFIG,
          isActive: true,
        })
        .where(eq(sports.slug, sport.slug));
      continue;
    }

    await db.insert(sports).values({
      id: crypto.randomUUID(),
      name: sport.name,
      slug: sport.slug,
      visibility: sport.visibility,
      tagline: sport.tagline,
      description: sport.description,
      tournamentConfig: sport.tournamentConfig ?? DEFAULT_SPORT_TOURNAMENT_CONFIG,
      isActive: true,
    });
    log.info("Auto-provisioned default sport", { slug: sport.slug });
  }
}
