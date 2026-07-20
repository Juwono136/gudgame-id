import "server-only";

import { AppError } from "@/lib/errors";
import {
  generateInviteCode,
  generateInviteToken,
  getDefaultInviteExpiry,
  hashInviteSecret,
} from "@/lib/tournaments/invitations/crypto";

/** Shareable invite links/codes are reusable by anyone until this window ends. */
export const INVITE_VALIDITY_DAYS = 7;

export type InviteCredentials = {
  token: string;
  code: string;
  codeHash: string;
  expiresAt: Date;
};

export type ShareableInviteRecord = {
  id: string;
  status: string;
  expiresAt: Date;
};

export function isInvitePastExpiry(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() < now;
}

export function createInviteCredentials(
  validityDays: number = INVITE_VALIDITY_DAYS,
): InviteCredentials {
  const code = generateInviteCode();
  return {
    token: generateInviteToken(),
    code,
    codeHash: hashInviteSecret(code),
    expiresAt: getDefaultInviteExpiry(validityDays),
  };
}

/** Non-shareable stub credentials for accepted-membership / redemption rows. */
export function createAcceptanceStubCredentials(
  expiresAt: Date,
): Omit<InviteCredentials, "code"> & { code: null } {
  const code = generateInviteCode();
  return {
    token: generateInviteToken(),
    code: null,
    codeHash: hashInviteSecret(code),
    expiresAt,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; cause?: { code?: string }; message?: string };
  if (e.code === "23505") return true;
  if (e.cause?.code === "23505") return true;
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return message.includes("unique") && message.includes("constraint");
}

/**
 * Insert helper with credential regeneration on rare unique collisions.
 * Hosts may generate as many invites as needed — no soft cap.
 */
export async function insertWithUniqueInviteCredentials<T>(
  insert: (credentials: InviteCredentials) => Promise<T>,
  options?: { maxAttempts?: number; validityDays?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const validityDays = options?.validityDays ?? INVITE_VALIDITY_DAYS;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const credentials = createInviteCredentials(validityDays);
    try {
      return await insert(credentials);
    } catch (error) {
      lastError = error;
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  throw new AppError("Could not generate a unique invite. Please try again.", {
    code: "CONFLICT",
    statusCode: 409,
    cause: lastError,
  });
}

/**
 * Shareable invites (pending) are multi-use until expiry/revoke.
 * After INVITE_VALIDITY_DAYS they become invalid and a new invite must be generated.
 */
export function assertShareableInviteUsable(
  invite: ShareableInviteRecord,
  options?: { now?: number },
): void {
  const now = options?.now ?? Date.now();

  if (invite.status === "revoked") {
    throw new AppError(
      "This invite was removed by the organizer. Ask them for a new link or code.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  if (invite.status === "expired" || isInvitePastExpiry(invite.expiresAt, now)) {
    throw new AppError(
      "This invite has expired. Ask the organizer to generate a new link or code.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  if (invite.status !== "pending") {
    throw new AppError("This invite is no longer available.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function inviteExpiredErrorMessage(): string {
  return "This invite has expired. Ask the organizer to generate a new link or code.";
}
