import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerMembers } from "@/db/schema/partners";

export async function isUserPartnerMember(
  userId: string,
  partnerId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: partnerMembers.id })
    .from(partnerMembers)
    .where(
      and(eq(partnerMembers.userId, userId), eq(partnerMembers.partnerId, partnerId)),
    )
    .limit(1);
  return Boolean(row);
}
