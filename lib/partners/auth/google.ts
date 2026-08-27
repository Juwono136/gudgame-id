import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerIdentities,
  type PartnerIdentity,
} from "@/db/schema/partner-auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { AppError } from "@/lib/errors";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { verifyFirebaseGoogleIdToken } from "@/lib/firebase/admin";
import { isPostgresUniqueViolation } from "@/lib/partners/auth/db-errors";
import {
  createPartnerPlayerSession,
  linkOrCreatePartnerPlayerRow,
  revokeAllPartnerPlayerSessions,
  toPartnerPlayerSessionView,
  type PartnerPlayerSessionView,
} from "@/lib/partners/auth/service";
import type { PartnerPublicView } from "@/lib/partners/service";
import { logger } from "@/lib/logger";
import { partnerPhoneForAutofill } from "@/lib/partners/registration/phone";

const log = logger.child({ module: "partner-auth/google" });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Keep linked player contact in sync when Google updates the identity email.
 * Never clears password_hash. Skips player email update if another active
 * player already owns that email (unique constraint).
 */
async function syncPlayerEmailIfSafe(input: {
  partnerId: string;
  identityId: string;
  email: string;
}): Promise<void> {
  const db = getDb();
  const [player] = await db
    .select({
      id: partnerPlayers.id,
      email: partnerPlayers.email,
      archivedAt: partnerPlayers.archivedAt,
    })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partnerId),
        eq(partnerPlayers.identityId, input.identityId),
      ),
    )
    .limit(1);

  if (!player || player.archivedAt || player.email === input.email) return;

  const [taken] = await db
    .select({ id: partnerPlayers.id })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partnerId),
        eq(partnerPlayers.email, input.email),
        ne(partnerPlayers.id, player.id),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .limit(1);

  if (taken) {
    log.warn("Skipped player email sync — email already used by another player", {
      partnerId: input.partnerId,
      identityId: input.identityId,
    });
    return;
  }

  await db
    .update(partnerPlayers)
    .set({ email: input.email })
    .where(eq(partnerPlayers.id, player.id));
}

async function assertPlayerNotArchived(
  partnerId: string,
  identityId: string,
): Promise<{ id: string; phone: string } | null> {
  const db = getDb();
  const [player] = await db
    .select({
      id: partnerPlayers.id,
      phone: partnerPlayers.phone,
      archivedAt: partnerPlayers.archivedAt,
    })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, partnerId),
        eq(partnerPlayers.identityId, identityId),
      ),
    )
    .limit(1);

  if (player?.archivedAt) {
    await revokeAllPartnerPlayerSessions(identityId);
    throw new AppError("This member account has been removed by the partner", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return player ? { id: player.id, phone: player.phone } : null;
}

async function finishSession(input: {
  partnerId: string;
  identity: PartnerIdentity;
  playerId: string | null;
  isNewUser: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
  displayNameFallback: string;
  email: string;
  phone?: string | null;
}): Promise<{
  token: string;
  session: PartnerPlayerSessionView;
  isNewUser: boolean;
}> {
  let playerId = input.playerId;
  if (!playerId) {
    playerId = await linkOrCreatePartnerPlayerRow({
      partnerId: input.partnerId,
      identityId: input.identity.id,
      email: input.email,
      displayName: input.identity.displayName || input.displayNameFallback,
      phone: "",
    });
  }

  const { token } = await createPartnerPlayerSession({
    partnerId: input.partnerId,
    identityId: input.identity.id,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  return {
    token,
    isNewUser: input.isNewUser,
    session: toPartnerPlayerSessionView(
      input.identity,
      playerId,
      partnerPhoneForAutofill(input.phone),
    ),
  };
}

/**
 * Sign in or register a partner member with a verified Firebase Google ID token.
 *
 * Guarantees (non-interference):
 * - Never creates/reads Gud Game Better Auth users or cookies
 * - Scoped strictly to `input.partner.id`
 * - Never clears `password_hash` (email/password accounts keep password when linking Google)
 * - Email/password signup & login paths remain unchanged for non-Google accounts
 */
export async function loginOrSignupPartnerPlayerWithGoogle(
  input: {
    partner: PartnerPublicView;
    idToken: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
  attempt = 0,
): Promise<{
  token: string;
  session: PartnerPlayerSessionView;
  isNewUser: boolean;
}> {
  if (!isFirebaseAdminConfigured()) {
    throw new AppError("Google sign-in is not available right now", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  if (attempt > 1) {
    throw new AppError(
      "Could not complete Google sign-in due to a concurrent signup. Please try again.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  let googleUser;
  try {
    googleUser = await verifyFirebaseGoogleIdToken(input.idToken);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.warn("Firebase Google token verification failed", {
      partnerId: input.partner.id,
    });
    throw new AppError("Invalid or expired Google sign-in token. Please try again.", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  const email = normalizeEmail(googleUser.email);
  const displayName = (
    googleUser.name?.trim() ||
    email.split("@")[0] ||
    "Player"
  ).slice(0, 120);
  const googleUid = googleUser.uid;

  const db = getDb();
  const partnerId = input.partner.id;
  const now = new Date();

  // 1) Prefer existing link by Google UID (stable even if Google display email changes)
  const [byGoogle] = await db
    .select()
    .from(partnerIdentities)
    .where(
      and(
        eq(partnerIdentities.partnerId, partnerId),
        eq(partnerIdentities.googleUid, googleUid),
      ),
    )
    .limit(1);

  if (byGoogle) {
    let identity = byGoogle;

    if (byGoogle.email !== email) {
      const [emailTaken] = await db
        .select({ id: partnerIdentities.id })
        .from(partnerIdentities)
        .where(
          and(
            eq(partnerIdentities.partnerId, partnerId),
            eq(partnerIdentities.email, email),
          ),
        )
        .limit(1);

      if (!emailTaken) {
        const [updated] = await db
          .update(partnerIdentities)
          .set({
            email,
            emailVerifiedAt: byGoogle.emailVerifiedAt ?? now,
            // Never touch passwordHash
            updatedAt: now,
          })
          .where(eq(partnerIdentities.id, byGoogle.id))
          .returning();
        if (updated) {
          identity = updated;
          await syncPlayerEmailIfSafe({
            partnerId,
            identityId: updated.id,
            email,
          });
        }
      }
    } else if (!byGoogle.emailVerifiedAt) {
      const [updated] = await db
        .update(partnerIdentities)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(eq(partnerIdentities.id, byGoogle.id))
        .returning();
      if (updated) identity = updated;
    }

    const player = await assertPlayerNotArchived(partnerId, identity.id);
    return finishSession({
      partnerId,
      identity,
      playerId: player?.id ?? null,
      isNewUser: false,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      displayNameFallback: displayName,
      email: identity.email,
      phone: player?.phone,
    });
  }

  // 2) Match by email → link Google (proves inbox ownership). Preserves password_hash.
  const [byEmail] = await db
    .select()
    .from(partnerIdentities)
    .where(
      and(
        eq(partnerIdentities.partnerId, partnerId),
        eq(partnerIdentities.email, email),
      ),
    )
    .limit(1);

  if (byEmail) {
    if (byEmail.googleUid && byEmail.googleUid !== googleUid) {
      throw new AppError(
        "This email is already linked to a different Google account on this partner",
        { code: "CONFLICT", statusCode: 409 },
      );
    }

    const [updated] = await db
      .update(partnerIdentities)
      .set({
        googleUid,
        emailVerifiedAt: byEmail.emailVerifiedAt ?? now,
        // Keep existing display name; never clear passwordHash
        displayName: byEmail.displayName?.trim() ? byEmail.displayName : displayName,
        updatedAt: now,
      })
      .where(eq(partnerIdentities.id, byEmail.id))
      .returning();

    const identity = updated ?? {
      ...byEmail,
      googleUid,
      emailVerifiedAt: byEmail.emailVerifiedAt ?? now,
    };

    const player = await assertPlayerNotArchived(partnerId, identity.id);
    return finishSession({
      partnerId,
      identity,
      playerId: player?.id ?? null,
      isNewUser: false,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      displayNameFallback: displayName,
      email,
      phone: player?.phone,
    });
  }

  // 3) Create Google-only member for this partner only
  try {
    const [created] = await db
      .insert(partnerIdentities)
      .values({
        partnerId,
        email,
        passwordHash: null,
        googleUid,
        displayName,
        emailVerifiedAt: now,
      })
      .returning();

    if (!created) {
      throw new AppError("Could not create account", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }

    const playerId = await linkOrCreatePartnerPlayerRow({
      partnerId,
      identityId: created.id,
      email,
      displayName,
      phone: "",
    });

    const { token } = await createPartnerPlayerSession({
      partnerId,
      identityId: created.id,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    log.info("Partner Google signup", {
      partnerId,
      identityId: created.id,
    });

    return {
      token,
      isNewUser: true,
      session: toPartnerPlayerSessionView(created, playerId, null),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (!isPostgresUniqueViolation(err)) {
      log.error("Partner Google signup failed", {
        partnerId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new AppError("Could not create account", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }

    // Concurrent signup with same email/google_uid — retry as login
    log.info("Partner Google signup race — retrying as login", { partnerId });
    return loginOrSignupPartnerPlayerWithGoogle(input, attempt + 1);
  }
}
