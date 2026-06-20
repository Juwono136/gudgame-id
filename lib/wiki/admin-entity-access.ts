import "server-only";

import { and, eq, isNull, ne, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema";
import { AppError } from "@/lib/errors";

export type WikiEntityAdminAccessRow = {
  id: string;
  sportId: string;
  entityType: string;
  createdBy: string | null;
  ownerUserId: string | null;
};

/** Players self-managed via signup (ownerUserId set) are hidden from the admin wiki directory. */
export function adminWikiEntityVisibilityCondition(adminUserId: string): SQL {
  return or(
    ne(wikiEntities.entityType, "player"),
    and(
      eq(wikiEntities.entityType, "player"),
      eq(wikiEntities.createdBy, adminUserId),
      isNull(wikiEntities.ownerUserId),
    ),
  )!;
}

export function isAdminManagedPlayerRow(
  row: Pick<WikiEntityAdminAccessRow, "entityType" | "createdBy" | "ownerUserId">,
  adminUserId: string,
): boolean {
  if (row.entityType !== "player") return true;
  return row.createdBy === adminUserId && row.ownerUserId == null;
}

export function assertAdminCanManageWikiEntity(
  row: WikiEntityAdminAccessRow,
  adminUserId: string,
  sportId: string,
): void {
  if (row.sportId !== sportId) {
    throw new AppError("Wiki entity not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (!isAdminManagedPlayerRow(row, adminUserId)) {
    throw new AppError(
      "This player profile is managed by the account owner and cannot be edited from the admin console.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
}

export async function getWikiEntityAdminAccessRow(
  id: string,
): Promise<WikiEntityAdminAccessRow | null> {
  const [row] = await getDb()
    .select({
      id: wikiEntities.id,
      sportId: wikiEntities.sportId,
      entityType: wikiEntities.entityType,
      createdBy: wikiEntities.createdBy,
      ownerUserId: wikiEntities.ownerUserId,
    })
    .from(wikiEntities)
    .where(eq(wikiEntities.id, id))
    .limit(1);

  return row ?? null;
}
