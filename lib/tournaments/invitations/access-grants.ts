import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentAccessGrants,
  type AccessGrantRole,
} from "@/db/schema/tournament-invitations";
import { AppError } from "@/lib/errors";
import { buildInviteUrl } from "@/lib/tournaments/invitations/crypto";
import {
  insertWithUniqueInviteCredentials,
  inviteExpiredErrorMessage,
  isInvitePastExpiry,
  assertShareableInviteUsable,
} from "@/lib/tournaments/invitations/lifecycle";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type AccessInviteView = {
  id: string;
  role: AccessGrantRole;
  email: string | null;
  status: string;
  userId: string | null;
  redeemedUserName: string | null;
  redeemedUserImage: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  inviteUrl: string;
  inviteCode?: string;
};

const displayNameSql = sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name})`;

async function expireAccessInviteIfNeeded(
  id: string,
  status: string,
  expiresAt: Date,
): Promise<boolean> {
  if (status !== "pending" || !isInvitePastExpiry(expiresAt)) return false;
  await getDb()
    .update(tournamentAccessGrants)
    .set({ status: "expired" })
    .where(eq(tournamentAccessGrants.id, id));
  return true;
}

export async function createAccessInvite(input: {
  tournament: TournamentDetail;
  invitedByUserId: string;
  role: AccessGrantRole;
}): Promise<AccessInviteView> {
  const created = await insertWithUniqueInviteCredentials(async (credentials) => {
    const [row] = await getDb()
      .insert(tournamentAccessGrants)
      .values({
        tournamentId: input.tournament.id,
        email: null,
        role: input.role,
        inviteCodeHash: credentials.codeHash,
        inviteCode: credentials.code,
        inviteToken: credentials.token,
        status: "pending",
        expiresAt: credentials.expiresAt,
        invitedByUserId: input.invitedByUserId,
      })
      .returning();

    if (!row) {
      throw new AppError("Could not create access invite", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    return row;
  });

  return {
    id: created.id,
    role: created.role as AccessGrantRole,
    email: null,
    status: created.status,
    userId: created.userId,
    redeemedUserName: null,
    redeemedUserImage: null,
    expiresAt: created.expiresAt.toISOString(),
    acceptedAt: created.acceptedAt?.toISOString() ?? null,
    inviteUrl: buildInviteUrl({
      sportSlug: input.tournament.sportSlug,
      slug: input.tournament.slug,
      token: created.inviteToken,
      kind: "access",
    }),
    inviteCode: created.inviteCode ?? undefined,
  };
}

export async function listAccessInvites(
  tournament: Pick<TournamentDetail, "id" | "sportSlug" | "slug">,
): Promise<AccessInviteView[]> {
  const rows = await getDb()
    .select({
      id: tournamentAccessGrants.id,
      role: tournamentAccessGrants.role,
      email: tournamentAccessGrants.email,
      status: tournamentAccessGrants.status,
      userId: tournamentAccessGrants.userId,
      expiresAt: tournamentAccessGrants.expiresAt,
      acceptedAt: tournamentAccessGrants.acceptedAt,
      inviteToken: tournamentAccessGrants.inviteToken,
      inviteCode: tournamentAccessGrants.inviteCode,
      redeemedUserName: displayNameSql,
      redeemedUserImage: user.image,
    })
    .from(tournamentAccessGrants)
    .leftJoin(user, eq(tournamentAccessGrants.userId, user.id))
    .where(eq(tournamentAccessGrants.tournamentId, tournament.id));

  const views: AccessInviteView[] = [];
  for (const row of rows) {
    if (await expireAccessInviteIfNeeded(row.id, row.status, row.expiresAt)) continue;
    if (row.status !== "pending" && row.status !== "accepted") continue;

    views.push({
      id: row.id,
      role: row.role as AccessGrantRole,
      email: null,
      status: row.status,
      userId: row.userId,
      redeemedUserName: row.redeemedUserName,
      redeemedUserImage: row.redeemedUserImage,
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      inviteUrl:
        row.status === "pending" && row.inviteToken
          ? buildInviteUrl({
              sportSlug: tournament.sportSlug,
              slug: tournament.slug,
              token: row.inviteToken,
              kind: "access",
            })
          : "",
      inviteCode:
        row.status === "pending" && row.inviteCode ? row.inviteCode : undefined,
    });
  }

  return views;
}

/** View stored credentials without rotating — invites are immutable after create. */
export async function revealAccessInviteCredentials(input: {
  tournamentId: string;
  inviteId: string;
  sportSlug: string;
  slug: string;
}): Promise<{ inviteUrl: string; inviteCode: string }> {
  const db = getDb();
  const [grant] = await db
    .select()
    .from(tournamentAccessGrants)
    .where(
      and(
        eq(tournamentAccessGrants.id, input.inviteId),
        eq(tournamentAccessGrants.tournamentId, input.tournamentId),
      ),
    )
    .limit(1);

  if (!grant) {
    throw new AppError("Invite not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (await expireAccessInviteIfNeeded(grant.id, grant.status, grant.expiresAt)) {
    throw new AppError(inviteExpiredErrorMessage(), { code: "FORBIDDEN", statusCode: 403 });
  }

  assertShareableInviteUsable(grant);

  if (!grant.inviteToken) {
    throw new AppError("Invite link is unavailable.", { code: "CONFLICT", statusCode: 409 });
  }

  return {
    inviteUrl: buildInviteUrl({
      sportSlug: input.sportSlug,
      slug: input.slug,
      token: grant.inviteToken,
      kind: "access",
    }),
    inviteCode: grant.inviteCode ?? "",
  };
}

export async function revokeAccessInvite(input: {
  tournamentId: string;
  inviteId: string;
}): Promise<void> {
  const [updated] = await getDb()
    .update(tournamentAccessGrants)
    .set({ status: "revoked" })
    .where(
      and(
        eq(tournamentAccessGrants.id, input.inviteId),
        eq(tournamentAccessGrants.tournamentId, input.tournamentId),
      ),
    )
    .returning({ id: tournamentAccessGrants.id });

  if (!updated) {
    throw new AppError("Invite not found", { code: "NOT_FOUND", statusCode: 404 });
  }
}

/**
 * Multi-use invite: the pending link/code stays active for up to 7 days and can be
 * redeemed by any signed-in user. Each successful redeem creates a separate accepted row.
 */
export async function redeemAccessInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<{ tournamentId: string; role: AccessGrantRole }> {
  const { redeemInvite } = await import("@/lib/tournaments/invitations/redeem");
  const result = await redeemInvite({ ...input, preferredKind: "access" });
  if (result.kind !== "access") {
    throw new AppError(
      "This invite is a player invite. Open it again or choose Player when entering the code.",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }
  return { tournamentId: result.tournamentId, role: result.role };
}

export async function getActiveAccessGrantRole(
  tournamentId: string,
  userId: string,
): Promise<AccessGrantRole | null> {
  const [grant] = await getDb()
    .select({ role: tournamentAccessGrants.role })
    .from(tournamentAccessGrants)
    .where(
      and(
        eq(tournamentAccessGrants.tournamentId, tournamentId),
        eq(tournamentAccessGrants.userId, userId),
        eq(tournamentAccessGrants.status, "accepted"),
      ),
    )
    .limit(1);

  return (grant?.role as AccessGrantRole | undefined) ?? null;
}

/** True when this user previously had staff access that was revoked. */
export async function hasRevokedAccessGrant(
  tournamentId: string,
  userId: string,
): Promise<boolean> {
  const [grant] = await getDb()
    .select({ id: tournamentAccessGrants.id })
    .from(tournamentAccessGrants)
    .where(
      and(
        eq(tournamentAccessGrants.tournamentId, tournamentId),
        eq(tournamentAccessGrants.userId, userId),
        eq(tournamentAccessGrants.status, "revoked"),
      ),
    )
    .limit(1);

  return Boolean(grant);
}
