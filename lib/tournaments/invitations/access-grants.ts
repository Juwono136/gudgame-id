import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentAccessGrants,
  type AccessGrantRole,
} from "@/db/schema/tournament-invitations";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import {
  buildInviteUrl,
  generateInviteCode,
  generateInviteToken,
  getDefaultInviteExpiry,
  hashInviteSecret,
} from "@/lib/tournaments/invitations/crypto";
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

export async function createAccessInvite(input: {
  tournament: TournamentDetail;
  invitedByUserId: string;
  role: AccessGrantRole;
  email?: string | null;
}): Promise<AccessInviteView> {
  const token = generateInviteToken();
  const code = generateInviteCode();
  const expiresAt = getDefaultInviteExpiry();

  const [created] = await getDb()
    .insert(tournamentAccessGrants)
    .values({
      tournamentId: input.tournament.id,
      email: input.email?.trim().toLowerCase() || null,
      role: input.role,
      inviteCodeHash: hashInviteSecret(code),
      inviteToken: token,
      status: "pending",
      expiresAt,
      invitedByUserId: input.invitedByUserId,
    })
    .returning();

  if (!created) {
    throw new AppError("Could not create access invite", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  return {
    id: created.id,
    role: created.role as AccessGrantRole,
    email: created.email,
    status: created.status,
    userId: created.userId,
    redeemedUserName: null,
    redeemedUserImage: null,
    expiresAt: created.expiresAt.toISOString(),
    acceptedAt: created.acceptedAt?.toISOString() ?? null,
    inviteUrl: buildInviteUrl({
      sportSlug: input.tournament.sportSlug,
      slug: input.tournament.slug,
      token,
      kind: "access",
    }),
    inviteCode: code,
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
      redeemedUserName: user.name,
      redeemedUserImage: user.image,
    })
    .from(tournamentAccessGrants)
    .leftJoin(user, eq(tournamentAccessGrants.userId, user.id))
    .where(eq(tournamentAccessGrants.tournamentId, tournament.id));

  return rows
    .filter((row) => row.status === "pending" || row.status === "accepted")
    .map((row) => ({
      id: row.id,
      role: row.role as AccessGrantRole,
      email: row.email,
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
    }));
}

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
  if (grant.status !== "pending") {
    throw new AppError("Only pending invites can show link and code details.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    throw new AppError("This invite has expired.", { code: "FORBIDDEN", statusCode: 403 });
  }

  const token = generateInviteToken();
  const code = generateInviteCode();

  await db
    .update(tournamentAccessGrants)
    .set({
      inviteToken: token,
      inviteCodeHash: hashInviteSecret(code),
    })
    .where(eq(tournamentAccessGrants.id, grant.id));

  return {
    inviteUrl: buildInviteUrl({
      sportSlug: input.sportSlug,
      slug: input.slug,
      token,
      kind: "access",
    }),
    inviteCode: code,
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

export async function redeemAccessInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<{ tournamentId: string; role: AccessGrantRole }> {
  const db = getDb();
  let grant;

  if (input.token?.trim()) {
    [grant] = await db
      .select()
      .from(tournamentAccessGrants)
      .where(eq(tournamentAccessGrants.inviteToken, input.token.trim()))
      .limit(1);
  } else if (input.code?.trim() && input.tournamentId) {
    [grant] = await db
      .select()
      .from(tournamentAccessGrants)
      .where(
        and(
          eq(tournamentAccessGrants.tournamentId, input.tournamentId),
          eq(tournamentAccessGrants.inviteCodeHash, hashInviteSecret(input.code)),
        ),
      )
      .limit(1);
  } else {
    throw new AppError("Provide an invite token or code with tournament ID.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (!grant) {
    throw new AppError("Invalid or expired invite", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (grant.status === "revoked") {
    throw new AppError("This invite has been revoked.", { code: "FORBIDDEN", statusCode: 403 });
  }
  if (grant.status === "accepted" && grant.userId && grant.userId !== input.userId) {
    throw new AppError("This invite has already been used.", { code: "CONFLICT", statusCode: 409 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    await db
      .update(tournamentAccessGrants)
      .set({ status: "expired" })
      .where(eq(tournamentAccessGrants.id, grant.id));
    throw new AppError("This invite has expired.", { code: "FORBIDDEN", statusCode: 403 });
  }

  const [tournamentRow] = await db
    .select({ createdBy: tournaments.createdBy })
    .from(tournaments)
    .where(eq(tournaments.id, grant.tournamentId))
    .limit(1);

  if (tournamentRow?.createdBy === input.userId) {
    throw new AppError(
      "You already manage this tournament as the host. Staff invites are for other accounts.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  await db
    .update(tournamentAccessGrants)
    .set({
      status: "accepted",
      userId: input.userId,
      acceptedAt: new Date(),
    })
    .where(eq(tournamentAccessGrants.id, grant.id));

  return {
    tournamentId: grant.tournamentId,
    role: grant.role as AccessGrantRole,
  };
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
