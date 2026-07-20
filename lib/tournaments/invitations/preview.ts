import "server-only";

import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { tournaments } from "@/db/schema/tournaments";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { getAccessGrantRoleLabel } from "@/lib/tournaments/invitations/invite-ui";
import {
  assertUserIsNotTournamentHost,
  assertUserNotAlreadyRegisteredPlayer,
  resolveShareableInvite,
} from "@/lib/tournaments/invitations/resolve";

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

async function loadTournamentPreview(tournamentId: string) {
  const [row] = await getDb()
    .select({
      name: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!row) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  return row;
}

export async function previewInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
  preferredKind?: "access" | "player";
}): Promise<InvitePreview> {
  const resolved = await resolveShareableInvite({
    token: input.token,
    code: input.code,
    tournamentId: input.tournamentId,
    preferredKind: input.preferredKind,
    strictKind: Boolean(input.preferredKind),
  });

  const tournamentId = resolved.invite.tournamentId;
  const row = await loadTournamentPreview(tournamentId);

  if (resolved.kind === "access" && resolved.invite.status === "accepted") {
    if (resolved.invite.userId !== input.userId) {
      throw new AppError(
        "This invite link or code is invalid, expired, or was removed. Ask the organizer for a new invite.",
        { code: "NOT_FOUND", statusCode: 404 },
      );
    }
    return {
      kind: "access",
      tournamentId,
      tournamentName: row.name,
      sportSlug: row.sportSlug,
      slug: row.slug,
      role: resolved.invite.role,
      roleLabel: getAccessGrantRoleLabel(resolved.invite.role),
      expiresAt: resolved.invite.expiresAt.toISOString(),
    };
  }

  if (resolved.kind === "player" && resolved.invite.status === "accepted") {
    if (resolved.invite.redeemedByUserId !== input.userId) {
      throw new AppError(
        "This invite link or code is invalid, expired, or was removed. Ask the organizer for a new invite.",
        { code: "NOT_FOUND", statusCode: 404 },
      );
    }
    return {
      kind: "player",
      tournamentId,
      tournamentName: row.name,
      sportSlug: row.sportSlug,
      slug: row.slug,
      expiresAt: resolved.invite.expiresAt.toISOString(),
    };
  }

  await assertUserIsNotTournamentHost({
    userId: input.userId,
    tournamentId,
    kind: resolved.kind,
  });

  if (resolved.kind === "player") {
    await assertUserNotAlreadyRegisteredPlayer({
      userId: input.userId,
      tournamentId,
    });
  }

  if (resolved.kind === "access") {
    return {
      kind: "access",
      tournamentId,
      tournamentName: row.name,
      sportSlug: row.sportSlug,
      slug: row.slug,
      role: resolved.invite.role,
      roleLabel: getAccessGrantRoleLabel(resolved.invite.role),
      expiresAt: resolved.invite.expiresAt.toISOString(),
    };
  }

  return {
    kind: "player",
    tournamentId,
    tournamentName: row.name,
    sportSlug: row.sportSlug,
    slug: row.slug,
    expiresAt: resolved.invite.expiresAt.toISOString(),
  };
}

export async function previewAccessInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<InvitePreview> {
  return previewInvite({ ...input, preferredKind: "access" });
}

export async function previewPlayerInvite(input: {
  userId: string;
  token?: string;
  code?: string;
  tournamentId?: string;
}): Promise<InvitePreview> {
  return previewInvite({ ...input, preferredKind: "player" });
}
