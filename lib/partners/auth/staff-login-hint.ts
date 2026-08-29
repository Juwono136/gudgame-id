import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerMembers } from "@/db/schema/partners";
import { authRoutes } from "@/lib/constants/routes";
import { getBaseUrl } from "@/lib/auth/urls-server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PartnerStaffLoginHint = {
  staffLoginUrl: string;
  partnerDisplayName: string;
};

/**
 * When someone tries partner *player* login with an email that belongs to Gud Game
 * partner staff for this slug, return a redirect hint instead of a generic failure.
 */
export async function lookupPartnerStaffLoginHint(input: {
  partnerId: string;
  partnerSlug: string;
  partnerDisplayName: string;
  email: string;
}): Promise<PartnerStaffLoginHint | null> {
  const db = getDb();
  const email = normalizeEmail(input.email);

  const [staffUser] = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(partnerMembers, eq(partnerMembers.userId, user.id))
    .where(
      and(
        eq(user.email, email),
        eq(partnerMembers.partnerId, input.partnerId),
      ),
    )
    .limit(1);

  if (!staffUser) return null;

  const baseUrl = getBaseUrl();
  const callback = encodeURIComponent(`/${input.partnerSlug}`);
  return {
    staffLoginUrl: `${baseUrl}${authRoutes.login}?callbackUrl=${callback}`,
    partnerDisplayName: input.partnerDisplayName,
  };
}
