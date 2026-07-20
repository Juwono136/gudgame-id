import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentPlayerInvites } from "@/db/schema/tournament-invitations";
import { AppError } from "@/lib/errors";
import { buildInviteUrl } from "@/lib/tournaments/invitations/crypto";
import {
  insertWithUniqueInviteCredentials,
  isInvitePastExpiry,
} from "@/lib/tournaments/invitations/lifecycle";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type PlayerInviteView = {
  id: string;
  teamId: string | null;
  status: string;
  expiresAt: string;
  inviteUrl: string;
  inviteCode?: string;
  redeemedByUserId?: string | null;
  redeemedByName?: string | null;
  redeemedByImage?: string | null;
  redeemedAt?: string | null;
};

const displayNameSql = sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name})`;

async function expirePlayerInviteIfNeeded(
  id: string,
  status: string,
  expiresAt: Date,
): Promise<boolean> {
  if (status !== "pending" || !isInvitePastExpiry(expiresAt)) return false;
  await getDb()
    .update(tournamentPlayerInvites)
    .set({ status: "expired" })
    .where(eq(tournamentPlayerInvites.id, id));
  return true;
}

export async function createPlayerInvite(input: {
  tournament: TournamentDetail;
  invitedByUserId: string;
  teamId?: string | null;
}): Promise<PlayerInviteView> {
  const created = await insertWithUniqueInviteCredentials(async (credentials) => {
    const [row] = await getDb()
      .insert(tournamentPlayerInvites)
      .values({
        tournamentId: input.tournament.id,
        teamId: input.teamId ?? null,
        inviteCodeHash: credentials.codeHash,
        inviteCode: credentials.code,
        inviteToken: credentials.token,
        status: "pending",
        expiresAt: credentials.expiresAt,
        invitedByUserId: input.invitedByUserId,
      })
      .returning();

    if (!row) {
      throw new AppError("Could not create player invite", {
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    }
    return row;
  });

  return {
    id: created.id,
    teamId: created.teamId,
    status: created.status,
    expiresAt: created.expiresAt.toISOString(),
    inviteUrl: buildInviteUrl({
      sportSlug: input.tournament.sportSlug,
      slug: input.tournament.slug,
      token: created.inviteToken,
      kind: "player",
    }),
    inviteCode: created.inviteCode ?? undefined,
  };
}

/**
 * Multi-use invite: the pending link/code stays active for up to 7 days and can be
 * redeemed by any signed-in user. Each successful redeem creates a separate accepted row.
 */
export async function redeemPlayerInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<{ tournamentId: string; teamId: string | null }> {
  const { redeemInvite } = await import("@/lib/tournaments/invitations/redeem");
  const result = await redeemInvite({ ...input, preferredKind: "player" });
  if (result.kind !== "player") {
    throw new AppError(
      "This invite is a staff invite. Open it again or choose Staff when entering the code.",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }
  return { tournamentId: result.tournamentId, teamId: result.teamId };
}

export async function listPlayerInvites(
  tournament: Pick<TournamentDetail, "id" | "sportSlug" | "slug">,
): Promise<PlayerInviteView[]> {
  const rows = await getDb()
    .select({
      id: tournamentPlayerInvites.id,
      teamId: tournamentPlayerInvites.teamId,
      status: tournamentPlayerInvites.status,
      expiresAt: tournamentPlayerInvites.expiresAt,
      inviteToken: tournamentPlayerInvites.inviteToken,
      inviteCode: tournamentPlayerInvites.inviteCode,
      redeemedByUserId: tournamentPlayerInvites.redeemedByUserId,
      redeemedAt: tournamentPlayerInvites.redeemedAt,
      redeemedByName: displayNameSql,
      redeemedByImage: user.image,
    })
    .from(tournamentPlayerInvites)
    .leftJoin(user, eq(tournamentPlayerInvites.redeemedByUserId, user.id))
    .where(eq(tournamentPlayerInvites.tournamentId, tournament.id));

  const views: PlayerInviteView[] = [];
  for (const row of rows) {
    if (await expirePlayerInviteIfNeeded(row.id, row.status, row.expiresAt)) continue;
    if (row.status !== "pending" && row.status !== "accepted") continue;

    views.push({
      id: row.id,
      teamId: row.teamId,
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      inviteUrl:
        row.status === "pending" && row.inviteToken
          ? buildInviteUrl({
              sportSlug: tournament.sportSlug,
              slug: tournament.slug,
              token: row.inviteToken,
              kind: "player",
            })
          : "",
      inviteCode:
        row.status === "pending" && row.inviteCode ? row.inviteCode : undefined,
      redeemedByUserId: row.redeemedByUserId,
      redeemedByName: row.redeemedByName?.trim() || null,
      redeemedByImage: row.redeemedByImage,
      redeemedAt: row.redeemedAt?.toISOString() ?? null,
    });
  }

  return views;
}

export async function revokePlayerInvite(input: {
  tournamentId: string;
  inviteId: string;
}): Promise<void> {
  const [updated] = await getDb()
    .update(tournamentPlayerInvites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(tournamentPlayerInvites.id, input.inviteId),
        eq(tournamentPlayerInvites.tournamentId, input.tournamentId),
      ),
    )
    .returning({ id: tournamentPlayerInvites.id });

  if (!updated) {
    throw new AppError("Invite not found", { code: "NOT_FOUND", statusCode: 404 });
  }
}
