import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  PLAYER_SPORT_INTEREST_OPTIONS,
  type PlayerSportInterestSlug,
} from "@/lib/constants/player-sport-interests";

export type SportInterestItem = { slug: string; name: string };

export function resolveSportInterestItems(slugs: string[]): SportInterestItem[] {
  const map = new Map(
    PLAYER_SPORT_INTEREST_OPTIONS.map((o) => [o.slug, o.name] as const),
  );
  return slugs
    .filter((s): s is PlayerSportInterestSlug => map.has(s as PlayerSportInterestSlug))
    .map((slug) => ({ slug, name: map.get(slug)! }));
}

export async function getUserSportInterests(userId: string): Promise<SportInterestItem[]> {
  const [row] = await getDb()
    .select({ sportInterestSlugs: user.sportInterestSlugs })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const slugs = row?.sportInterestSlugs ?? [];
  return resolveSportInterestItems(slugs);
}
