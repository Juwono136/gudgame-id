import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentPlayerInvites } from "@/db/schema/tournament-invitations";
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

export type PlayerInviteView = {
  id: string;
  teamId: string | null;
  status: string;
  expiresAt: string;
  inviteUrl: string;
  inviteCode?: string;
  redeemedByUserId?: string | null;
  redeemedByName?: string | null;
  redeemedAt?: string | null;
};

export async function createPlayerInvite(input: {
  tournament: TournamentDetail;
  invitedByUserId: string;
  teamId?: string | null;
}): Promise<PlayerInviteView> {
  const token = generateInviteToken();
  const code = generateInviteCode();
  const expiresAt = getDefaultInviteExpiry();

  const [created] = await getDb()
    .insert(tournamentPlayerInvites)
    .values({
      tournamentId: input.tournament.id,
      teamId: input.teamId ?? null,
      inviteCodeHash: hashInviteSecret(code),
      inviteToken: token,
      status: "pending",
      expiresAt,
      invitedByUserId: input.invitedByUserId,
    })
    .returning();

  if (!created) {
    throw new AppError("Could not create player invite", {
      code: "DATABASE_ERROR",
      statusCode: 500,
    });
  }

  return {
    id: created.id,
    teamId: created.teamId,
    status: created.status,
    expiresAt: created.expiresAt.toISOString(),
    inviteUrl: buildInviteUrl({
      sportSlug: input.tournament.sportSlug,
      slug: input.tournament.slug,
      token,
      kind: "player",
    }),
    inviteCode: code,
  };
}

export async function redeemPlayerInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<{ tournamentId: string; teamId: string | null }> {
  const db = getDb();
  let invite;

  if (input.token?.trim()) {
    [invite] = await db
      .select()
      .from(tournamentPlayerInvites)
      .where(eq(tournamentPlayerInvites.inviteToken, input.token.trim()))
      .limit(1);
  } else if (input.code?.trim() && input.tournamentId) {
    [invite] = await db
      .select()
      .from(tournamentPlayerInvites)
      .where(
        and(
          eq(tournamentPlayerInvites.tournamentId, input.tournamentId),
          eq(tournamentPlayerInvites.inviteCodeHash, hashInviteSecret(input.code)),
        ),
      )
      .limit(1);
  } else {
    throw new AppError("Provide an invite token or code with tournament ID.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (!invite) {
    throw new AppError("Invalid or expired invite", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (invite.status === "revoked") {
    throw new AppError("This invite has been revoked.", { code: "FORBIDDEN", statusCode: 403 });
  }
  if (invite.status === "accepted" && invite.redeemedByUserId !== input.userId) {
    throw new AppError("This invite has already been used.", { code: "CONFLICT", statusCode: 409 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    await db
      .update(tournamentPlayerInvites)
      .set({ status: "expired" })
      .where(eq(tournamentPlayerInvites.id, invite.id));
    throw new AppError("This invite has expired.", { code: "FORBIDDEN", statusCode: 403 });
  }

  const [tournamentRow] = await db
    .select({ createdBy: tournaments.createdBy })
    .from(tournaments)
    .where(eq(tournaments.id, invite.tournamentId))
    .limit(1);

  if (tournamentRow?.createdBy === input.userId) {
    throw new AppError(
      "You already manage this tournament as the host. Player invites are for other accounts.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }

  await db
    .update(tournamentPlayerInvites)
    .set({
      status: "accepted",
      redeemedByUserId: input.userId,
      redeemedAt: new Date(),
    })
    .where(eq(tournamentPlayerInvites.id, invite.id));

  return {
    tournamentId: invite.tournamentId,
    teamId: invite.teamId,
  };
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
      redeemedByUserId: tournamentPlayerInvites.redeemedByUserId,
      redeemedAt: tournamentPlayerInvites.redeemedAt,
      redeemedByName: user.name,
      redeemedByNickname: user.nickname,
    })
    .from(tournamentPlayerInvites)
    .leftJoin(user, eq(tournamentPlayerInvites.redeemedByUserId, user.id))
    .where(eq(tournamentPlayerInvites.tournamentId, tournament.id));

  return rows
    .filter((row) => row.status === "pending" || row.status === "accepted")
    .map((row) => ({
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
      redeemedByUserId: row.redeemedByUserId,
      redeemedByName:
        row.redeemedByNickname?.trim() || row.redeemedByName?.trim() || null,
      redeemedAt: row.redeemedAt?.toISOString() ?? null,
    }));
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
