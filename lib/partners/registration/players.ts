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
 * Prefer an existing authenticated member row when `preferPlayerId` is provided.
 */
export async function upsertPartnerPlayer(
  partnerId: string,
  input: PartnerPlayerInput,
  options?: { preferPlayerId?: string | null; identityId?: string | null },
): Promise<PartnerPlayer> {
  const db = getDb();
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePartnerPhone(input.phone);

  if (options?.preferPlayerId) {
    const [preferred] = await db
      .select()
      .from(partnerPlayers)
      .where(
        and(
          eq(partnerPlayers.id, options.preferPlayerId),
          eq(partnerPlayers.partnerId, partnerId),
          isNull(partnerPlayers.archivedAt),
        ),
      )
      .limit(1);

    if (preferred) {
      const patch: {
        fullName?: string;
        email?: string;
        phone?: string;
        identityId?: string;
      } = {};
      if (preferred.fullName !== fullName) patch.fullName = fullName;
      if (preferred.email !== email) patch.email = email;
      if (preferred.phone !== phone) patch.phone = phone;
      if (options.identityId && !preferred.identityId) {
        patch.identityId = options.identityId;
      }
      if (Object.keys(patch).length > 0) {
        try {
          const [updated] = await db
            .update(partnerPlayers)
            .set(patch)
            .where(eq(partnerPlayers.id, preferred.id))
            .returning();
          return updated ?? preferred;
        } catch {
          return preferred;
        }
      }
      return preferred;
    }
  }

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
    const patch: { fullName?: string; identityId?: string } = {};
    if (existing.fullName !== fullName) patch.fullName = fullName;
    if (options?.identityId && !existing.identityId) {
      patch.identityId = options.identityId;
    }
    if (Object.keys(patch).length > 0) {
      const [updated] = await db
        .update(partnerPlayers)
        .set(patch)
        .where(eq(partnerPlayers.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  try {
    const [inserted] = await db
      .insert(partnerPlayers)
      .values({
        partnerId,
        fullName,
        email,
        phone,
        identityId: options?.identityId ?? null,
      })
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
