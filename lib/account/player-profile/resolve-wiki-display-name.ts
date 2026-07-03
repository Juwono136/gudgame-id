import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { PLAYER_DISPLAY_NAME_MAX } from "@/lib/wiki/player-profile-fields";

/** Resolves a publishable display name from account fields (non-throwing). */
export async function resolveWikiDisplayNameForUser(userId: string): Promise<string | null> {
  const [dbUser] = await getDb()
    .select({
      fullNameKtp: user.fullNameKtp,
      name: user.name,
      nickname: user.nickname,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) return null;

  const displayName = (
    dbUser.fullNameKtp?.trim() ||
    dbUser.name?.trim() ||
    dbUser.nickname?.trim() ||
    ""
  ).slice(0, PLAYER_DISPLAY_NAME_MAX);

  return displayName.length >= 2 ? displayName : null;
}
