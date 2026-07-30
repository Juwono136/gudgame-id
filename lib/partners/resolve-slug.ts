import "server-only";

import { getPartnerById } from "@/lib/partners/service";

/** Resolve public partner slug for invite / surface URLs when tournament.partnerId is set. */
export async function resolvePartnerSlugForTournament(
  partnerId: string | null | undefined,
): Promise<string | null> {
  if (!partnerId) return null;
  const partner = await getPartnerById(partnerId);
  return partner?.slug ?? null;
}
