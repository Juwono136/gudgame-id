import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentAccessGrants,
  tournamentPlayerInvites,
} from "@/db/schema/tournament-invitations";
import {
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { hashInviteSecret } from "@/lib/tournaments/invitations/crypto";
import {
  assertShareableInviteUsable,
  inviteExpiredErrorMessage,
  isInvitePastExpiry,
} from "@/lib/tournaments/invitations/lifecycle";

export type ResolvedShareableInvite =
  | {
      kind: "access";
      invite: typeof tournamentAccessGrants.$inferSelect;
    }
  | {
      kind: "player";
      invite: typeof tournamentPlayerInvites.$inferSelect;
    };

export function hostCannotUseInviteMessage(kind: "access" | "player"): string {
  return kind === "player"
    ? "You are the organizer of this tournament. Player invites are for other accounts — share the link or code with your players instead."
    : "You are the organizer of this tournament. Staff invites are for other accounts — share the link or code with your staff instead.";
}

export function alreadyRegisteredPlayerMessage(): string {
  return "You are already registered in this tournament, so this player invite cannot be used.";
}

export async function assertUserIsNotTournamentHost(input: {
  userId: string;
  tournamentId: string;
  kind: "access" | "player";
}): Promise<void> {
  const [row] = await getDb()
    .select({ createdBy: tournaments.createdBy })
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);

  if (row?.createdBy === input.userId) {
    throw new AppError(hostCannotUseInviteMessage(input.kind), {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
}

export async function isUserTournamentParticipant(
  tournamentId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournamentId),
        eq(tournamentTeamMembers.userId, userId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function assertUserNotAlreadyRegisteredPlayer(input: {
  userId: string;
  tournamentId: string;
}): Promise<void> {
  if (await isUserTournamentParticipant(input.tournamentId, input.userId)) {
    throw new AppError(alreadyRegisteredPlayerMessage(), {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
}

async function expireAccessRow(
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

async function expirePlayerRow(
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

/**
 * Resolve a shareable invite by token or code.
 * When `strictKind` is true, only the requested kind is searched (staff and player flows stay isolated).
 */
export async function resolveShareableInvite(input: {
  token?: string;
  code?: string;
  tournamentId?: string;
  preferredKind?: "access" | "player";
  /** When true, do not fall back to the other invite type. */
  strictKind?: boolean;
}): Promise<ResolvedShareableInvite> {
  const preferred = input.preferredKind ?? "access";
  const order: Array<"access" | "player"> = input.strictKind
    ? [preferred]
    : preferred === "player"
      ? ["player", "access"]
      : ["access", "player"];

  const db = getDb();

  for (const kind of order) {
    if (input.token?.trim()) {
      if (kind === "access") {
        const [grant] = await db
          .select()
          .from(tournamentAccessGrants)
          .where(eq(tournamentAccessGrants.inviteToken, input.token.trim()))
          .limit(1);
        if (!grant) continue;
        if (grant.status === "revoked") {
          throw new AppError(
            "This staff invite was removed by the organizer. Ask them for a new invite if you still need access.",
            { code: "FORBIDDEN", statusCode: 403 },
          );
        }
        if (grant.status === "accepted") {
          return { kind: "access", invite: grant };
        }
        if (await expireAccessRow(grant.id, grant.status, grant.expiresAt)) {
          throw new AppError(inviteExpiredErrorMessage(), {
            code: "FORBIDDEN",
            statusCode: 403,
          });
        }
        if (grant.status === "pending") {
          assertShareableInviteUsable(grant);
          return { kind: "access", invite: grant };
        }
        continue;
      }

      const [invite] = await db
        .select()
        .from(tournamentPlayerInvites)
        .where(eq(tournamentPlayerInvites.inviteToken, input.token.trim()))
        .limit(1);
      if (!invite) continue;
      if (invite.status === "revoked") {
        throw new AppError(
          "This player invite was removed by the organizer. Ask them for a new invite if you still need to join.",
          { code: "FORBIDDEN", statusCode: 403 },
        );
      }
      if (invite.status === "accepted") {
        return { kind: "player", invite };
      }
      if (await expirePlayerRow(invite.id, invite.status, invite.expiresAt)) {
        throw new AppError(inviteExpiredErrorMessage(), {
          code: "FORBIDDEN",
          statusCode: 403,
        });
      }
      if (invite.status === "pending") {
        assertShareableInviteUsable(invite);
        return { kind: "player", invite };
      }
      continue;
    }

    if (input.code?.trim() && input.tournamentId) {
      const codeHash = hashInviteSecret(input.code);
      if (kind === "access") {
        const [grant] = await db
          .select()
          .from(tournamentAccessGrants)
          .where(
            and(
              eq(tournamentAccessGrants.tournamentId, input.tournamentId),
              eq(tournamentAccessGrants.inviteCodeHash, codeHash),
            ),
          )
          .limit(1);
        if (!grant) continue;
        if (grant.status === "revoked") {
          throw new AppError(
            "This staff invite was removed by the organizer. Ask them for a new invite if you still need access.",
            { code: "FORBIDDEN", statusCode: 403 },
          );
        }
        if (grant.status === "accepted") {
          return { kind: "access", invite: grant };
        }
        if (await expireAccessRow(grant.id, grant.status, grant.expiresAt)) {
          throw new AppError(inviteExpiredErrorMessage(), {
            code: "FORBIDDEN",
            statusCode: 403,
          });
        }
        if (grant.status === "pending") {
          assertShareableInviteUsable(grant);
          return { kind: "access", invite: grant };
        }
        continue;
      }

      const [invite] = await db
        .select()
        .from(tournamentPlayerInvites)
        .where(
          and(
            eq(tournamentPlayerInvites.tournamentId, input.tournamentId),
            eq(tournamentPlayerInvites.inviteCodeHash, codeHash),
          ),
        )
        .limit(1);
      if (!invite) continue;
      if (invite.status === "revoked") {
        throw new AppError(
          "This player invite was removed by the organizer. Ask them for a new invite if you still need to join.",
          { code: "FORBIDDEN", statusCode: 403 },
        );
      }
      if (invite.status === "accepted") {
        return { kind: "player", invite };
      }
      if (await expirePlayerRow(invite.id, invite.status, invite.expiresAt)) {
        throw new AppError(inviteExpiredErrorMessage(), {
          code: "FORBIDDEN",
          statusCode: 403,
        });
      }
      if (invite.status === "pending") {
        assertShareableInviteUsable(invite);
        return { kind: "player", invite };
      }
    }
  }

  if (!input.token?.trim() && !(input.code?.trim() && input.tournamentId)) {
    throw new AppError("Provide an invite token or code with tournament ID.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (input.strictKind) {
    throw new AppError(
      preferred === "player"
        ? "This is not a valid player invite link or code for this tournament."
        : "This is not a valid staff invite link or code for this tournament.",
      { code: "NOT_FOUND", statusCode: 404 },
    );
  }

  throw new AppError(
    "This invite link or code is invalid, expired, or was removed. Ask the organizer for a new invite.",
    { code: "NOT_FOUND", statusCode: 404 },
  );
}
