import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { wikiEntities } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { resolvePlayerDisplayNameFromAccount } from "@/lib/wiki/player-profile-fields";
import { listOwnedPlayerEntityIds } from "@/lib/account/player-profile/owned-entities";

export async function requirePlayerDisplayNameForUser(userId: string): Promise<string> {
  const [dbUser] = await getDb()
    .select({
      fullNameKtp: user.fullNameKtp,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const displayName = resolvePlayerDisplayNameFromAccount(dbUser);
  if (displayName.length < 2) {
    throw new AppError(
      "Add your full name in the Profile section before creating or updating your player page.",
      {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: {
          fieldErrors: {
            fullNameKtp: ["Full name is required for your public player page."],
          },
        },
      },
    );
  }

  return displayName;
}

/** Keeps wiki `displayName` in sync when the account full name changes. */
export async function syncPlayerDisplayNameFromUser(userId: string): Promise<void> {
  const entityIds = await listOwnedPlayerEntityIds(userId);
  if (entityIds.length === 0) return;

  const displayName = await requirePlayerDisplayNameForUser(userId);
  const now = new Date();

  await getDb()
    .update(wikiEntities)
    .set({
      displayName,
      updatedBy: userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(wikiEntities.ownerUserId, userId),
        eq(wikiEntities.entityType, "player"),
      ),
    );
}
