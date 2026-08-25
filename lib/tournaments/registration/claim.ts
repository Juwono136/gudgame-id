import "server-only";

import { and, eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { syncPlayerWikiPerformanceSafe } from "@/lib/account/player-performance/sync-wiki";
import {
  hashRosterClaimToken,
  normalizeInviteEmail,
} from "@/lib/tournaments/registration/claim-tokens";
import { syncOfficialMatchToPlayerHistory } from "@/lib/tournaments/stats/sync";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

const log = logger.child({ module: "roster-claim" });

export type RosterClaimPreview = {
  memberId: string;
  displayName: string;
  email: string;
  teamName: string;
  tournamentName: string;
  sportSlug: string;
  tournamentSlug: string;
  expiresAt: string | null;
  expired: boolean;
  alreadyClaimed: boolean;
};

type PendingClaimRow = {
  memberId: string;
  userId: string | null;
  pendingDisplayName: string | null;
  pendingEmail: string | null;
  claimExpiresAt: Date | null;
  invitedByUserId: string | null;
  teamId: string;
  teamName: string;
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  tournamentSlug: string;
};

async function loadPendingByToken(token: string): Promise<PendingClaimRow | null> {
  const tokenHash = hashRosterClaimToken(token);
  const [row] = await getDb()
    .select({
      memberId: tournamentTeamMembers.id,
      userId: tournamentTeamMembers.userId,
      pendingDisplayName: tournamentTeamMembers.pendingDisplayName,
      pendingEmail: tournamentTeamMembers.pendingEmail,
      claimExpiresAt: tournamentTeamMembers.claimExpiresAt,
      invitedByUserId: tournamentTeamMembers.invitedByUserId,
      teamId: tournamentTeamMembers.teamId,
      teamName: tournamentTeams.name,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournamentTeamMembers.claimTokenHash, tokenHash))
    .limit(1);

  return row ?? null;
}

export async function previewRosterClaim(token: string): Promise<RosterClaimPreview> {
  const row = await loadPendingByToken(token);
  if (!row) {
    throw new AppError("This invite link is invalid or has already been used.", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const expired =
    row.claimExpiresAt != null && row.claimExpiresAt.getTime() < Date.now();

  return {
    memberId: row.memberId,
    displayName: row.pendingDisplayName ?? "Player",
    email: row.pendingEmail ?? "",
    teamName: row.teamName,
    tournamentName: row.tournamentName,
    sportSlug: row.sportSlug,
    tournamentSlug: row.tournamentSlug,
    expiresAt: row.claimExpiresAt?.toISOString() ?? null,
    expired,
    alreadyClaimed: Boolean(row.userId),
  };
}

export async function claimRosterSlot(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ tournamentSlug: string; sportSlug: string; teamName: string }> {
  const row = await loadPendingByToken(input.token);
  if (!row) {
    throw new AppError("This invite link is invalid or has already been used.", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  if (row.userId) {
    throw new AppError("This roster slot has already been claimed.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (row.claimExpiresAt && row.claimExpiresAt.getTime() < Date.now()) {
    throw new AppError("This invite has expired. Ask your captain to invite you again.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const sessionEmail = normalizeInviteEmail(input.userEmail);
  const inviteEmail = normalizeInviteEmail(row.pendingEmail ?? "");
  if (!inviteEmail || sessionEmail !== inviteEmail) {
    throw new AppError(
      `Sign in with ${row.pendingEmail} to claim this slot. The logged-in account email must match the invite.`,
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  const db = getDb();

  const [alreadyOnTeam] = await db
    .select({ id: tournamentTeamMembers.id })
    .from(tournamentTeamMembers)
    .where(
      and(
        eq(tournamentTeamMembers.teamId, row.teamId),
        eq(tournamentTeamMembers.userId, input.userId),
      ),
    )
    .limit(1);
  if (alreadyOnTeam) {
    throw new AppError("You are already on this team.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const [onOtherTeam] = await db
    .select({ id: tournamentTeamMembers.id })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .where(
      and(
        eq(tournamentTeams.tournamentId, row.tournamentId),
        eq(tournamentTeamMembers.userId, input.userId),
      ),
    )
    .limit(1);
  if (onOtherTeam) {
    throw new AppError("You are already registered on another team in this tournament.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const updated = await db
    .update(tournamentTeamMembers)
    .set({
      userId: input.userId,
      pendingDisplayName: null,
      pendingEmail: null,
      pendingPhone: null,
      claimTokenHash: null,
      claimExpiresAt: null,
      claimedAt: new Date(),
      invitedByUserId: row.invitedByUserId,
    })
    .where(
      and(
        eq(tournamentTeamMembers.id, row.memberId),
        eq(tournamentTeamMembers.claimTokenHash, hashRosterClaimToken(input.token)),
      ),
    )
    .returning({ id: tournamentTeamMembers.id });

  if (!updated.length) {
    throw new AppError("Could not claim this slot. It may have just been claimed.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  try {
    await backfillCareerHistoryAfterClaim({
      tournamentId: row.tournamentId,
      teamId: row.teamId,
      userId: input.userId,
    });
  } catch (err) {
    log.error("Career backfill after claim failed", err, {
      memberId: row.memberId,
      userId: input.userId,
      tournamentId: row.tournamentId,
    });
  }

  return {
    tournamentSlug: row.tournamentSlug,
    sportSlug: row.sportSlug,
    teamName: row.teamName,
  };
}

async function backfillCareerHistoryAfterClaim(input: {
  tournamentId: string;
  teamId: string;
  userId: string;
}): Promise<void> {
  const tournament = await getTournamentById(input.tournamentId);
  if (!tournament || tournament.tournamentType !== "official" || tournament.partnerId) {
    return;
  }

  const db = getDb();
  const [reg] = await db
    .select({ status: tournamentRegistrations.status })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, input.tournamentId),
        eq(tournamentRegistrations.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (reg?.status !== "confirmed") {
    await syncPlayerWikiPerformanceSafe(input.userId, tournament.sportId);
    return;
  }

  const bracketMatches = await db
    .select({
      id: tournamentBracketMatches.id,
      teamAId: tournamentBracketMatches.teamAId,
      teamBId: tournamentBracketMatches.teamBId,
      teamAName: tournamentBracketMatches.teamAName,
      teamBName: tournamentBracketMatches.teamBName,
      scoreA: tournamentBracketMatches.scoreA,
      scoreB: tournamentBracketMatches.scoreB,
      roundNumber: tournamentBracketMatches.roundNumber,
    })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, input.tournamentId),
        eq(tournamentBracketMatches.status, "completed"),
        or(
          eq(tournamentBracketMatches.teamAId, input.teamId),
          eq(tournamentBracketMatches.teamBId, input.teamId),
        ),
      ),
    );

  for (const match of bracketMatches) {
    if (match.scoreA == null || match.scoreB == null) continue;
    await syncOfficialMatchToPlayerHistory({
      tournament,
      roundLabel: `Round ${match.roundNumber}`,
      fixtureId: match.id,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      participantUserIds: [input.userId],
    });
  }

  const groupMatches = await db
    .select({
      id: tournamentGroupMatches.id,
      teamAId: tournamentGroupMatches.teamAId,
      teamBId: tournamentGroupMatches.teamBId,
      teamAName: tournamentGroupMatches.teamAName,
      teamBName: tournamentGroupMatches.teamBName,
      scoreA: tournamentGroupMatches.scoreA,
      scoreB: tournamentGroupMatches.scoreB,
    })
    .from(tournamentGroupMatches)
    .where(
      and(
        eq(tournamentGroupMatches.tournamentId, input.tournamentId),
        eq(tournamentGroupMatches.status, "completed"),
        or(
          eq(tournamentGroupMatches.teamAId, input.teamId),
          eq(tournamentGroupMatches.teamBId, input.teamId),
        ),
      ),
    );

  for (const match of groupMatches) {
    if (match.scoreA == null || match.scoreB == null) continue;
    await syncOfficialMatchToPlayerHistory({
      tournament,
      roundLabel: "Group",
      fixtureId: match.id,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      participantUserIds: [input.userId],
    });
  }

  await syncPlayerWikiPerformanceSafe(input.userId, tournament.sportId);
}

export async function listPendingInvitesForTeam(teamId: string) {
  return getDb()
    .select({
      id: tournamentTeamMembers.id,
      email: tournamentTeamMembers.pendingEmail,
      displayName: tournamentTeamMembers.pendingDisplayName,
      claimTokenHash: tournamentTeamMembers.claimTokenHash,
      inviteSentAt: tournamentTeamMembers.inviteSentAt,
    })
    .from(tournamentTeamMembers)
    .where(
      and(
        eq(tournamentTeamMembers.teamId, teamId),
        isNotNull(tournamentTeamMembers.pendingEmail),
        isNotNull(tournamentTeamMembers.claimTokenHash),
      ),
    );
}
