import "server-only";

import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";

/** Resolve display names for scorekeeper user ids (nickname preferred). */
export async function resolveScorekeeperNameMap(
  userIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id?.trim())))];
  if (!unique.length) return new Map();
  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      nickname: user.nickname,
    })
    .from(user)
    .where(inArray(user.id, unique));
  return new Map(
    rows.map((row) => [row.id, row.nickname?.trim() || row.name?.trim() || "Scorekeeper"]),
  );
}

export function scorekeeperLabelFromMap(
  map: Map<string, string>,
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  return map.get(userId) ?? null;
}
