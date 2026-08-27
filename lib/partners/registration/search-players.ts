import "server-only";

import { and, asc, eq, ilike, isNull, not, notInArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerPlayers } from "@/db/schema/partner-players";

export type PartnerPlayerSearchResult = {
  playerId: string;
  fullName: string;
  email: string;
  phone: string;
  /** True when linked to a partner_identities member account. */
  isMember: boolean;
};

const SYNTHETIC_EMAIL_SUFFIX = "@partner.invalid";

/**
 * Partner-scoped player directory search for registration teammate linking.
 * Never queries Gud Game `user` / wiki — isolation is by partnerId only.
 * Soft-profile synthetic contacts are excluded from results.
 */
export async function searchPartnerPlayersForRegistration(
  partnerId: string,
  query: string,
  options?: {
    limit?: number;
    excludePlayerIds?: string[];
  },
): Promise<PartnerPlayerSearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 20);
  const pattern = `%${term}%`;
  const exclude = (options?.excludePlayerIds ?? []).filter(Boolean);
  const db = getDb();

  const rows = await db
    .select({
      playerId: partnerPlayers.id,
      fullName: partnerPlayers.fullName,
      email: partnerPlayers.email,
      phone: partnerPlayers.phone,
      identityId: partnerPlayers.identityId,
    })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, partnerId),
        isNull(partnerPlayers.archivedAt),
        not(ilike(partnerPlayers.email, `%${SYNTHETIC_EMAIL_SUFFIX}`)),
        or(
          ilike(partnerPlayers.fullName, pattern),
          ilike(partnerPlayers.email, pattern),
          ilike(partnerPlayers.phone, pattern),
        ),
        exclude.length > 0 ? notInArray(partnerPlayers.id, exclude) : undefined,
      ),
    )
    .orderBy(asc(partnerPlayers.fullName))
    .limit(limit);

  return rows.map((row) => ({
    playerId: row.playerId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    isMember: Boolean(row.identityId),
  }));
}

export function isSyntheticPartnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX);
}
