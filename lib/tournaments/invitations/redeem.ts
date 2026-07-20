import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentAccessGrants,
  tournamentPlayerInvites,
  type AccessGrantRole,
} from "@/db/schema/tournament-invitations";
import { createAcceptanceStubCredentials } from "@/lib/tournaments/invitations/lifecycle";
import {
  assertUserIsNotTournamentHost,
  assertUserNotAlreadyRegisteredPlayer,
  resolveShareableInvite,
} from "@/lib/tournaments/invitations/resolve";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";

export type RedeemInviteResult =
  | { kind: "access"; tournamentId: string; role: AccessGrantRole }
  | { kind: "player"; tournamentId: string; teamId: string | null };

/**
 * Redeem a shareable invite. Auto-detects staff vs player from credentials so
 * official free player links are not rejected when the client sends the wrong kind.
 */
export async function redeemInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
  preferredKind?: "access" | "player";
}): Promise<RedeemInviteResult> {
  const resolved = await resolveShareableInvite({
    token: input.token,
    code: input.code,
    tournamentId: input.tournamentId,
    preferredKind: input.preferredKind,
    strictKind: Boolean(input.preferredKind),
  });

  if (resolved.kind === "access") {
    const grant = resolved.invite;

    if (grant.status === "accepted" && grant.userId === input.userId) {
      return {
        kind: "access",
        tournamentId: grant.tournamentId,
        role: grant.role as AccessGrantRole,
      };
    }

    await assertUserIsNotTournamentHost({
      userId: input.userId,
      tournamentId: grant.tournamentId,
      kind: "access",
    });

    const existingRole = await getActiveAccessGrantRole(grant.tournamentId, input.userId);
    if (existingRole) {
      return {
        kind: "access",
        tournamentId: grant.tournamentId,
        role: existingRole,
      };
    }

    const stub = createAcceptanceStubCredentials(grant.expiresAt);
    await getDb().insert(tournamentAccessGrants).values({
      tournamentId: grant.tournamentId,
      userId: input.userId,
      email: null,
      role: grant.role,
      inviteCodeHash: stub.codeHash,
      inviteCode: null,
      inviteToken: stub.token,
      status: "accepted",
      expiresAt: stub.expiresAt,
      invitedByUserId: grant.invitedByUserId,
      acceptedAt: new Date(),
    });

    return {
      kind: "access",
      tournamentId: grant.tournamentId,
      role: grant.role as AccessGrantRole,
    };
  }

  const invite = resolved.invite;

  if (invite.status === "accepted" && invite.redeemedByUserId === input.userId) {
    return {
      kind: "player",
      tournamentId: invite.tournamentId,
      teamId: invite.teamId,
    };
  }

  await assertUserIsNotTournamentHost({
    userId: input.userId,
    tournamentId: invite.tournamentId,
    kind: "player",
  });

  await assertUserNotAlreadyRegisteredPlayer({
    userId: input.userId,
    tournamentId: invite.tournamentId,
  });

  const [alreadyRedeemed] = await getDb()
    .select({ id: tournamentPlayerInvites.id, teamId: tournamentPlayerInvites.teamId })
    .from(tournamentPlayerInvites)
    .where(
      and(
        eq(tournamentPlayerInvites.tournamentId, invite.tournamentId),
        eq(tournamentPlayerInvites.redeemedByUserId, input.userId),
        eq(tournamentPlayerInvites.status, "accepted"),
      ),
    )
    .limit(1);

  if (alreadyRedeemed) {
    // Already redeemed invite record but may not be on a team yet — still block if registered
    return {
      kind: "player",
      tournamentId: invite.tournamentId,
      teamId: alreadyRedeemed.teamId ?? invite.teamId,
    };
  }

  const stub = createAcceptanceStubCredentials(invite.expiresAt);
  await getDb().insert(tournamentPlayerInvites).values({
    tournamentId: invite.tournamentId,
    teamId: invite.teamId,
    inviteCodeHash: stub.codeHash,
    inviteCode: null,
    inviteToken: stub.token,
    status: "accepted",
    expiresAt: stub.expiresAt,
    invitedByUserId: invite.invitedByUserId,
    redeemedByUserId: input.userId,
    redeemedAt: new Date(),
  });

  return {
    kind: "player",
    tournamentId: invite.tournamentId,
    teamId: invite.teamId,
  };
}
