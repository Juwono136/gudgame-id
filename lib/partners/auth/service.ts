import "server-only";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerIdentities,
  partnerIdentitySessions,
  partnerIdentityVerifications,
  type PartnerIdentity,
} from "@/db/schema/partner-auth";
import { partnerPlayers } from "@/db/schema/partner-players";
import { AppError } from "@/lib/errors";
import {
  PARTNER_PLAYER_EMAIL_VERIFY_EXPIRES_IN_SECONDS,
  PARTNER_PLAYER_PASSWORD_RESET_EXPIRES_IN_SECONDS,
  PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS,
} from "@/lib/partners/auth/constants";
import {
  hashPartnerPassword,
  verifyPartnerPassword,
} from "@/lib/partners/auth/password";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/partners/auth/tokens";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import {
  absolutePartnerAuthUrl,
  partnerResetPasswordUrl,
  partnerVerifyEmailUrl,
} from "@/lib/partners/auth/urls-server";
import {
  sendPartnerPlayerPasswordChangedEmail,
  sendPartnerPlayerResetPasswordEmail,
  sendPartnerPlayerVerifyEmail,
} from "@/lib/partners/auth/emails";
import type { PartnerPublicView } from "@/lib/partners/service";
import { partnerPhoneForAutofill } from "@/lib/partners/registration/phone";

export type PartnerPlayerSessionView = {
  identityId: string;
  partnerId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  playerId: string | null;
  /**
   * Real phone from `partner_players` when available (null for synthetic
   * Google placeholders). Used to autofill tournament registration.
   */
  phone: string | null;
  /** True when a password hash is set (email/password or added after Google). */
  hasPassword: boolean;
  /** True when this identity is linked to Google (Firebase UID). */
  googleLinked: boolean;
};

export function toPartnerPlayerSessionView(
  identity: Pick<
    PartnerIdentity,
    "id" | "partnerId" | "email" | "displayName" | "emailVerifiedAt" | "passwordHash" | "googleUid"
  >,
  playerId: string | null,
  phone: string | null = null,
): PartnerPlayerSessionView {
  return {
    identityId: identity.id,
    partnerId: identity.partnerId,
    email: identity.email,
    displayName: identity.displayName,
    emailVerified: Boolean(identity.emailVerifiedAt),
    playerId,
    phone,
    hasPassword: Boolean(identity.passwordHash),
    googleLinked: Boolean(identity.googleUid),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 32);
}

/** Cached dummy hash so failed logins still run verifyPassword (timing hygiene). */
let timingSafeDummyHashPromise: Promise<string> | null = null;

function getTimingSafeDummyHash(): Promise<string> {
  if (!timingSafeDummyHashPromise) {
    timingSafeDummyHashPromise = hashPartnerPassword(
      "__gg_partner_player_timing_dummy__",
    );
  }
  return timingSafeDummyHashPromise;
}

async function createVerificationToken(input: {
  partnerId: string;
  identityId: string;
  kind: "email_verify" | "password_reset";
  expiresInSeconds: number;
}): Promise<string> {
  const db = getDb();
  const token = generateOpaqueToken(32);
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);

  // Invalidate previous unused tokens of the same kind
  await db
    .update(partnerIdentityVerifications)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(partnerIdentityVerifications.identityId, input.identityId),
        eq(partnerIdentityVerifications.kind, input.kind),
        isNull(partnerIdentityVerifications.consumedAt),
      ),
    );

  await db.insert(partnerIdentityVerifications).values({
    partnerId: input.partnerId,
    identityId: input.identityId,
    kind: input.kind,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function linkOrCreatePartnerPlayerRow(input: {
  partnerId: string;
  identityId: string;
  email: string;
  displayName: string;
  phone: string;
}): Promise<string> {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone) || `p${input.identityId.replace(/-/g, "").slice(0, 15)}`;

  const [existing] = await db
    .select()
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partnerId),
        eq(partnerPlayers.email, email),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.identityId && existing.identityId !== input.identityId) {
      throw new AppError("This email is already linked to another member account", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    await db
      .update(partnerPlayers)
      .set({
        identityId: input.identityId,
        fullName: input.displayName,
        ...(normalizePhone(input.phone) ? { phone } : {}),
      })
      .where(eq(partnerPlayers.id, existing.id));
    return existing.id;
  }

  // Phone may collide with another guest — fall back to identity-scoped phone
  try {
    const [created] = await db
      .insert(partnerPlayers)
      .values({
        partnerId: input.partnerId,
        identityId: input.identityId,
        fullName: input.displayName,
        email,
        phone,
      })
      .returning({ id: partnerPlayers.id });
    if (!created) {
      throw new AppError("Could not create player profile", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    return created.id;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const fallbackPhone = `p${input.identityId.replace(/-/g, "").slice(0, 15)}`;
    const [created] = await db
      .insert(partnerPlayers)
      .values({
        partnerId: input.partnerId,
        identityId: input.identityId,
        fullName: input.displayName,
        email,
        phone: fallbackPhone,
      })
      .returning({ id: partnerPlayers.id });
    if (!created) {
      throw new AppError("Could not create player profile", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    return created.id;
  }
}

export async function signupPartnerPlayer(input: {
  partner: PartnerPublicView;
  email: string;
  password: string;
  displayName: string;
  phone: string;
}): Promise<{ identity: PartnerIdentity; verifyToken: string }> {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim().slice(0, 120);

  const [dup] = await db
    .select({ id: partnerIdentities.id })
    .from(partnerIdentities)
    .where(
      and(
        eq(partnerIdentities.partnerId, input.partner.id),
        eq(partnerIdentities.email, email),
      ),
    )
    .limit(1);

  if (dup) {
    throw new AppError("An account with this email already exists for this partner", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const passwordHash = await hashPartnerPassword(input.password);
  const [identity] = await db
    .insert(partnerIdentities)
    .values({
      partnerId: input.partner.id,
      email,
      passwordHash,
      displayName,
    })
    .returning();

  if (!identity) {
    throw new AppError("Could not create account", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  await linkOrCreatePartnerPlayerRow({
    partnerId: input.partner.id,
    identityId: identity.id,
    email,
    displayName,
    phone: input.phone,
  });

  const verifyToken = await createVerificationToken({
    partnerId: input.partner.id,
    identityId: identity.id,
    kind: "email_verify",
    expiresInSeconds: PARTNER_PLAYER_EMAIL_VERIFY_EXPIRES_IN_SECONDS,
  });

  void sendPartnerPlayerVerifyEmail({
    to: email,
    userName: displayName,
    partner: input.partner,
    verifyUrl: partnerVerifyEmailUrl(input.partner.slug, verifyToken),
  });

  return { identity, verifyToken };
}

export async function createPartnerPlayerSession(input: {
  partnerId: string;
  identityId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = generateOpaqueToken(32);
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(
    Date.now() + PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS * 1000,
  );

  await db.insert(partnerIdentitySessions).values({
    partnerId: input.partnerId,
    identityId: input.identityId,
    tokenHash,
    expiresAt,
    userAgent: input.userAgent?.slice(0, 512) ?? null,
    ipAddress: input.ipAddress?.slice(0, 64) ?? null,
  });

  await db
    .update(partnerIdentities)
    .set({ lastLoginAt: new Date() })
    .where(eq(partnerIdentities.id, input.identityId));

  return { token, expiresAt };
}

export async function loginPartnerPlayer(input: {
  partner: PartnerPublicView;
  email: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ token: string; session: PartnerPlayerSessionView }> {
  const db = getDb();
  const email = normalizeEmail(input.email);

  const [identity] = await db
    .select()
    .from(partnerIdentities)
    .where(
      and(
        eq(partnerIdentities.partnerId, input.partner.id),
        eq(partnerIdentities.email, email),
      ),
    )
    .limit(1);

  // Always verify against a real hash so missing / Google-only emails take similar time.
  const hasPassword = Boolean(identity?.passwordHash);
  const passwordHash = identity?.passwordHash ?? (await getTimingSafeDummyHash());
  const passwordOk = await verifyPartnerPassword(input.password, passwordHash);

  if (!identity || !hasPassword || !passwordOk) {
    const { lookupPartnerStaffLoginHint } = await import(
      "@/lib/partners/auth/staff-login-hint"
    );
    const staffHint = await lookupPartnerStaffLoginHint({
      partnerId: input.partner.id,
      partnerSlug: input.partner.slug,
      partnerDisplayName: input.partner.displayName,
      email,
    });
    if (staffHint) {
      throw new AppError(
        "This email is registered as partner staff. Sign in with your Gud Game account to open the Partner Console.",
        {
          code: "FORBIDDEN",
          statusCode: 403,
          context: { staffLoginHint: staffHint, reason: "PARTNER_STAFF_USE_GUDGAME_LOGIN" },
        },
      );
    }

    if (identity && !hasPassword) {
      throw new AppError(
        "This account uses Google Sign-In. Continue with Google, or set a password via Forgot password.",
        { code: "GOOGLE_ONLY_ACCOUNT", statusCode: 401 },
      );
    }
    throw new AppError("Invalid email or password", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  if (!identity.emailVerifiedAt) {
    throw new AppError("Please verify your email before signing in", {
      code: "EMAIL_NOT_VERIFIED",
      statusCode: 403,
    });
  }

  const [player] = await db
    .select({
      id: partnerPlayers.id,
      phone: partnerPlayers.phone,
      archivedAt: partnerPlayers.archivedAt,
    })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partner.id),
        eq(partnerPlayers.identityId, identity.id),
      ),
    )
    .limit(1);

  if (player?.archivedAt) {
    await revokeAllPartnerPlayerSessions(identity.id);
    throw new AppError("This member account has been removed by the partner", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const { token } = await createPartnerPlayerSession({
    partnerId: input.partner.id,
    identityId: identity.id,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  return {
    token,
    session: toPartnerPlayerSessionView(
      identity,
      player?.id ?? null,
      partnerPhoneForAutofill(player?.phone),
    ),
  };
}

export async function resolvePartnerPlayerSession(input: {
  partnerId: string;
  token: string | null | undefined;
}): Promise<PartnerPlayerSessionView | null> {
  if (!input.token) return null;
  const db = getDb();
  const tokenHash = hashOpaqueToken(input.token);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: partnerIdentitySessions.id,
      expiresAt: partnerIdentitySessions.expiresAt,
      identityId: partnerIdentities.id,
      partnerId: partnerIdentities.partnerId,
      email: partnerIdentities.email,
      displayName: partnerIdentities.displayName,
      emailVerifiedAt: partnerIdentities.emailVerifiedAt,
      passwordHash: partnerIdentities.passwordHash,
      googleUid: partnerIdentities.googleUid,
    })
    .from(partnerIdentitySessions)
    .innerJoin(
      partnerIdentities,
      eq(partnerIdentitySessions.identityId, partnerIdentities.id),
    )
    .where(
      and(
        eq(partnerIdentitySessions.tokenHash, tokenHash),
        eq(partnerIdentitySessions.partnerId, input.partnerId),
        gt(partnerIdentitySessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Sliding expiry
  const halfLife =
    Date.now() + (PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS * 1000) / 2;
  if (row.expiresAt.getTime() < halfLife) {
    await db
      .update(partnerIdentitySessions)
      .set({
        expiresAt: new Date(
          Date.now() + PARTNER_PLAYER_SESSION_EXPIRES_IN_SECONDS * 1000,
        ),
      })
      .where(eq(partnerIdentitySessions.id, row.sessionId));
  }

  const [player] = await db
    .select({
      id: partnerPlayers.id,
      phone: partnerPlayers.phone,
      archivedAt: partnerPlayers.archivedAt,
    })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partnerId),
        eq(partnerPlayers.identityId, row.identityId),
      ),
    )
    .limit(1);

  if (player?.archivedAt) {
    await db
      .delete(partnerIdentitySessions)
      .where(eq(partnerIdentitySessions.id, row.sessionId));
    return null;
  }

  return toPartnerPlayerSessionView(
    {
      id: row.identityId,
      partnerId: row.partnerId,
      email: row.email,
      displayName: row.displayName,
      emailVerifiedAt: row.emailVerifiedAt,
      passwordHash: row.passwordHash,
      googleUid: row.googleUid,
    },
    player?.id ?? null,
    partnerPhoneForAutofill(player?.phone),
  );
}

export async function logoutPartnerPlayerSession(input: {
  partnerId: string;
  token: string | null | undefined;
}): Promise<void> {
  if (!input.token) return;
  const db = getDb();
  const tokenHash = hashOpaqueToken(input.token);
  await db
    .delete(partnerIdentitySessions)
    .where(
      and(
        eq(partnerIdentitySessions.tokenHash, tokenHash),
        eq(partnerIdentitySessions.partnerId, input.partnerId),
      ),
    );
}

export async function revokeAllPartnerPlayerSessions(identityId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(partnerIdentitySessions)
    .where(eq(partnerIdentitySessions.identityId, identityId));
}

export async function verifyPartnerPlayerEmail(input: {
  partnerId: string;
  token: string;
}): Promise<PartnerIdentity> {
  const db = getDb();
  const tokenHash = hashOpaqueToken(input.token);
  const now = new Date();

  const [row] = await db
    .select({
      verificationId: partnerIdentityVerifications.id,
      identityId: partnerIdentityVerifications.identityId,
      expiresAt: partnerIdentityVerifications.expiresAt,
      consumedAt: partnerIdentityVerifications.consumedAt,
      kind: partnerIdentityVerifications.kind,
    })
    .from(partnerIdentityVerifications)
    .where(
      and(
        eq(partnerIdentityVerifications.tokenHash, tokenHash),
        eq(partnerIdentityVerifications.partnerId, input.partnerId),
      ),
    )
    .limit(1);

  if (!row || row.kind !== "email_verify" || row.consumedAt || row.expiresAt <= now) {
    throw new AppError("This verification link is invalid or has expired", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  await db
    .update(partnerIdentityVerifications)
    .set({ consumedAt: now })
    .where(eq(partnerIdentityVerifications.id, row.verificationId));

  const [identity] = await db
    .update(partnerIdentities)
    .set({ emailVerifiedAt: now })
    .where(eq(partnerIdentities.id, row.identityId))
    .returning();

  if (!identity) {
    throw new AppError("Account not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  return identity;
}

export async function requestPartnerPlayerPasswordReset(input: {
  partner: PartnerPublicView;
  email: string;
}): Promise<{ sent: boolean }> {
  const db = getDb();
  const email = normalizeEmail(input.email);

  const [identity] = await db
    .select()
    .from(partnerIdentities)
    .where(
      and(
        eq(partnerIdentities.partnerId, input.partner.id),
        eq(partnerIdentities.email, email),
      ),
    )
    .limit(1);

  // Always return sent=true to avoid email enumeration across tenants
  if (!identity) return { sent: true };

  const [player] = await db
    .select({ archivedAt: partnerPlayers.archivedAt })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partner.id),
        eq(partnerPlayers.identityId, identity.id),
      ),
    )
    .limit(1);

  // Archived members cannot reset — still respond generically
  if (player?.archivedAt) return { sent: true };

  const token = await createVerificationToken({
    partnerId: input.partner.id,
    identityId: identity.id,
    kind: "password_reset",
    expiresInSeconds: PARTNER_PLAYER_PASSWORD_RESET_EXPIRES_IN_SECONDS,
  });

  void sendPartnerPlayerResetPasswordEmail({
    to: email,
    userName: identity.displayName,
    partner: input.partner,
    resetUrl: partnerResetPasswordUrl(input.partner.slug, token),
  });

  return { sent: true };
}

export async function resetPartnerPlayerPassword(input: {
  partner: PartnerPublicView;
  token: string;
  newPassword: string;
}): Promise<void> {
  const db = getDb();
  const tokenHash = hashOpaqueToken(input.token);
  const now = new Date();

  const [row] = await db
    .select({
      verificationId: partnerIdentityVerifications.id,
      identityId: partnerIdentityVerifications.identityId,
      expiresAt: partnerIdentityVerifications.expiresAt,
      consumedAt: partnerIdentityVerifications.consumedAt,
      kind: partnerIdentityVerifications.kind,
    })
    .from(partnerIdentityVerifications)
    .where(
      and(
        eq(partnerIdentityVerifications.tokenHash, tokenHash),
        eq(partnerIdentityVerifications.partnerId, input.partner.id),
      ),
    )
    .limit(1);

  if (
    !row ||
    row.kind !== "password_reset" ||
    row.consumedAt ||
    row.expiresAt <= now
  ) {
    throw new AppError("This reset link is invalid or has expired", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const [player] = await db
    .select({ archivedAt: partnerPlayers.archivedAt })
    .from(partnerPlayers)
    .where(
      and(
        eq(partnerPlayers.partnerId, input.partner.id),
        eq(partnerPlayers.identityId, row.identityId),
      ),
    )
    .limit(1);

  if (player?.archivedAt) {
    await db
      .update(partnerIdentityVerifications)
      .set({ consumedAt: now })
      .where(eq(partnerIdentityVerifications.id, row.verificationId));
    throw new AppError("This member account has been removed by the partner", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  const passwordHash = await hashPartnerPassword(input.newPassword);

  await db
    .update(partnerIdentityVerifications)
    .set({ consumedAt: now })
    .where(eq(partnerIdentityVerifications.id, row.verificationId));

  const [identity] = await db
    .update(partnerIdentities)
    .set({ passwordHash })
    .where(eq(partnerIdentities.id, row.identityId))
    .returning();

  await revokeAllPartnerPlayerSessions(row.identityId);

  if (identity) {
    void sendPartnerPlayerPasswordChangedEmail({
      to: identity.email,
      userName: identity.displayName,
      partner: input.partner,
      loginUrl: absolutePartnerAuthUrl(
        input.partner.slug,
        partnerAuthRoutes(input.partner.slug).login,
      ),
    });
  }
}

export async function resendPartnerPlayerVerification(input: {
  partner: PartnerPublicView;
  email: string;
}): Promise<void> {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const [identity] = await db
    .select()
    .from(partnerIdentities)
    .where(
      and(
        eq(partnerIdentities.partnerId, input.partner.id),
        eq(partnerIdentities.email, email),
      ),
    )
    .limit(1);

  if (!identity || identity.emailVerifiedAt) return;

  const token = await createVerificationToken({
    partnerId: input.partner.id,
    identityId: identity.id,
    kind: "email_verify",
    expiresInSeconds: PARTNER_PLAYER_EMAIL_VERIFY_EXPIRES_IN_SECONDS,
  });

  void sendPartnerPlayerVerifyEmail({
    to: email,
    userName: identity.displayName,
    partner: input.partner,
    verifyUrl: partnerVerifyEmailUrl(input.partner.slug, token),
  });
}

/** Purge expired sessions (optional maintenance). */
export async function purgeExpiredPartnerPlayerSessions(): Promise<void> {
  const db = getDb();
  await db
    .delete(partnerIdentitySessions)
    .where(sql`${partnerIdentitySessions.expiresAt} < now()`);
}
