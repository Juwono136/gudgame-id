import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerIdentities } from "@/db/schema/partner-auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { AppError } from "@/lib/errors";
import { revokeAllPartnerPlayerSessions } from "@/lib/partners/auth/service";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-player-update" });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 32);
}

export async function updatePartnerPlayer(input: {
  partnerId: string;
  playerId: string;
  fullName: string;
  email: string;
  phone: string;
}): Promise<{ id: string }> {
  const db = getDb();
  const fullName = input.fullName.trim().slice(0, 120);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (fullName.length < 2) {
    throw new AppError("Name must be at least 2 characters", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  if (!email.includes("@")) {
    throw new AppError("Enter a valid email address", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  if (phone.length < 8) {
    throw new AppError("Enter a valid phone number", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const [player] = await db
    .select()
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.id, input.playerId),
        eq(partnerPlayers.partnerId, input.partnerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .limit(1);

  if (!player) {
    throw new AppError("Player not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const [emailTaken] = await db
    .select({ id: partnerPlayers.id })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partnerId),
        eq(partnerPlayers.email, email),
        ne(partnerPlayers.id, input.playerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .limit(1);

  if (emailTaken) {
    throw new AppError("Another player already uses this email", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [phoneTaken] = await db
    .select({ id: partnerPlayers.id })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partnerId),
        eq(partnerPlayers.phone, phone),
        ne(partnerPlayers.id, input.playerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .limit(1);

  if (phoneTaken) {
    throw new AppError("Another player already uses this phone", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (player.identityId) {
    const [identityEmailTaken] = await db
      .select({ id: partnerIdentities.id })
      .from(partnerIdentities)
      .where(
        and(
          eq(partnerIdentities.partnerId, input.partnerId),
          eq(partnerIdentities.email, email),
          ne(partnerIdentities.id, player.identityId),
        ),
      )
      .limit(1);

    if (identityEmailTaken) {
      throw new AppError("This email is already used by another member account", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    const emailChanged = normalizeEmail(player.email) !== email;
    await db
      .update(partnerIdentities)
      .set({
        email,
        displayName: fullName,
        ...(emailChanged ? { emailVerifiedAt: null } : {}),
      })
      .where(eq(partnerIdentities.id, player.identityId));

    if (emailChanged) {
      await revokeAllPartnerPlayerSessions(player.identityId);
    }
  }

  const [updated] = await db
    .update(partnerPlayers)
    .set({ fullName, email, phone })
    .where(
      and(
        eq(partnerPlayers.id, input.playerId),
        eq(partnerPlayers.partnerId, input.partnerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .returning({ id: partnerPlayers.id });

  if (!updated) {
    throw new AppError("Could not update player", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  log.info("Partner player updated", {
    partnerId: input.partnerId,
    playerId: input.playerId,
  });

  return updated;
}

/** Revoke member sessions when a staff archives a linked player. */
export async function revokeSessionsForArchivedPlayer(input: {
  partnerId: string;
  playerId: string;
}): Promise<void> {
  const db = getDb();
  const [player] = await db
    .select({ identityId: partnerPlayers.identityId })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.id, input.playerId),
        eq(partnerPlayers.partnerId, input.partnerId),
      ),
    )
    .limit(1);

  if (player?.identityId) {
    await revokeAllPartnerPlayerSessions(player.identityId);
  }
}
