import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournaments } from "@/db/schema/tournaments";
import {
  tournamentAccessGrants,
  tournamentPlayerInvites,
} from "@/db/schema/tournament-invitations";
import { sports } from "@/db/schema/sports";
import { AppError } from "@/lib/errors";
import { hashInviteSecret } from "@/lib/tournaments/invitations/crypto";
import { getAccessGrantRoleLabel } from "@/lib/tournaments/invitations/invite-ui";

export type InvitePreview = {
  kind: "access" | "player";
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  slug: string;
  role?: string;
  roleLabel?: string;
  expiresAt: string;
};

async function assertNotSelfInvite(input: {
  userId: string;
  tournamentId: string;
  createdBy: string | null;
}): Promise<void> {
  if (input.createdBy && input.createdBy === input.userId) {
    throw new AppError(
      "You already manage this tournament as the host. Staff or player invites are for other accounts.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}

export async function previewAccessInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<InvitePreview> {
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
    throw new AppError("This invite has been removed.", { code: "FORBIDDEN", statusCode: 403 });
  }
  if (grant.status === "accepted" && grant.userId && grant.userId !== input.userId) {
    throw new AppError("This invite has already been used.", { code: "CONFLICT", statusCode: 409 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    throw new AppError("This invite has expired.", { code: "FORBIDDEN", statusCode: 403 });
  }

  const [row] = await db
    .select({
      name: tournaments.name,
      slug: tournaments.slug,
      createdBy: tournaments.createdBy,
      sportSlug: sports.slug,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournaments.id, grant.tournamentId))
    .limit(1);

  if (!row) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await assertNotSelfInvite({
    userId: input.userId,
    tournamentId: grant.tournamentId,
    createdBy: row.createdBy,
  });

  return {
    kind: "access",
    tournamentId: grant.tournamentId,
    tournamentName: row.name,
    sportSlug: row.sportSlug,
    slug: row.slug,
    role: grant.role,
    roleLabel: getAccessGrantRoleLabel(grant.role),
    expiresAt: grant.expiresAt.toISOString(),
  };
}

export async function previewPlayerInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<InvitePreview> {
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
    throw new AppError("This invite has been removed.", { code: "FORBIDDEN", statusCode: 403 });
  }
  if (invite.status === "accepted" && invite.redeemedByUserId !== input.userId) {
    throw new AppError("This invite has already been used.", { code: "CONFLICT", statusCode: 409 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new AppError("This invite has expired.", { code: "FORBIDDEN", statusCode: 403 });
  }

  const [row] = await db
    .select({
      name: tournaments.name,
      slug: tournaments.slug,
      createdBy: tournaments.createdBy,
      sportSlug: sports.slug,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournaments.id, invite.tournamentId))
    .limit(1);

  if (!row) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await assertNotSelfInvite({
    userId: input.userId,
    tournamentId: invite.tournamentId,
    createdBy: row.createdBy,
  });

  return {
    kind: "player",
    tournamentId: invite.tournamentId,
    tournamentName: row.name,
    sportSlug: row.sportSlug,
    slug: row.slug,
    expiresAt: invite.expiresAt.toISOString(),
  };
}
