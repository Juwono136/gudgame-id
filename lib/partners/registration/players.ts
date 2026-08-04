import "server-only";

import { createHash } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerPlayers, type PartnerPlayer } from "@/db/schema/partner-players";
import { normalizePartnerPhone } from "@/lib/partners/registration/phone";

export type PartnerPlayerInput = {
  fullName: string;
  email: string;
  phone: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deterministic placeholder contact for members who only gave a name.
 * Live scoring still needs an opaque partner_players row per roster slot.
 */
export function buildSyntheticMemberContact(
  registrationId: string,
  roleOrder: number,
): { email: string; phone: string } {
  const seed = createHash("sha256").update(`${registrationId}:${roleOrder}`).digest("hex");
  const digits = seed
    .split("")
    .map((ch) => (Number.parseInt(ch, 16) % 10).toString())
    .join("")
    .slice(0, 9);

  return {
    email: `noreply+${registrationId}-${roleOrder}@partner.invalid`,
    phone: `9${digits}`,
  };
}

/**
 * Find-or-create a partner-scoped guest player by (partnerId, email) or (partnerId, phone).
 * Refreshes the stored name when it changed.
 */
export async function upsertPartnerPlayer(
  partnerId: string,
  input: PartnerPlayerInput,
): Promise<PartnerPlayer> {
  const db = getDb();
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePartnerPhone(input.phone);

  const [existing] = await db
    .select()
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, partnerId),
        isNull(partnerPlayers.archivedAt),
        or(eq(partnerPlayers.email, email), eq(partnerPlayers.phone, phone)),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.fullName !== fullName) {
      const [updated] = await db
        .update(partnerPlayers)
        .set({ fullName })
        .where(eq(partnerPlayers.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  try {
    const [inserted] = await db
      .insert(partnerPlayers)
      .values({ partnerId, fullName, email, phone })
      .returning();

    if (!inserted) {
      throw new Error("Could not create partner player");
    }
    return inserted;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes("unique") || message.includes("partner_players_partner")) {
      const [raceWinner] = await db
        .select()
        .from(partnerPlayers)
        .where(
          and(
            eq(partnerPlayers.partnerId, partnerId),
            isNull(partnerPlayers.archivedAt),
            or(eq(partnerPlayers.email, email), eq(partnerPlayers.phone, phone)),
          ),
        )
        .limit(1);
      if (raceWinner) return raceWinner;
    }
    throw cause;
  }
}
