import "server-only";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { siteConfig } from "@/lib/config/site";
import { sendTemplatedEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import {
  buildRosterClaimUrl,
  generateRosterClaimToken,
  hashRosterClaimToken,
} from "@/lib/tournaments/registration/claim-tokens";
import { notifyTeamMemberInvitations } from "@/lib/tournaments/registration/notify-flow";
import type { TournamentDetail } from "@/lib/tournaments/service";

const log = logger.child({ module: "roster-invites" });

function formatExpiry(date: Date | null): string {
  if (!date) return "the end of the tournament grace period";
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function loadCaptainName(captainUserId: string): Promise<string> {
  const { user } = await import("@/db/schema/auth");
  const [row] = await getDb()
    .select({ name: user.name, nickname: user.nickname })
    .from(user)
    .where(eq(user.id, captainUserId))
    .limit(1);
  return row?.nickname?.trim() || row?.name?.trim() || "Your captain";
}

/**
 * Send linked-user team invites + pending claim emails.
 * Call only after registration is **confirmed** (free) or **paid** (paid Official).
 * Regenerates claim tokens so plaintext never needs long-term storage.
 */
export async function dispatchOfficialRosterInvites(input: {
  tournament: TournamentDetail;
  registrationId: string;
  teamId: string;
  captainUserId: string;
  teamName: string;
  /** Only notify these linked user ids (defaults to all non-captain linked members). */
  linkedMemberUserIds?: string[];
}): Promise<void> {
  const db = getDb();

  const linkedRows = await db
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(
      and(
        eq(tournamentTeamMembers.teamId, input.teamId),
        isNotNull(tournamentTeamMembers.userId),
      ),
    );

  const linkedIds =
    input.linkedMemberUserIds ??
    linkedRows.map((r) => r.userId).filter((id): id is string => Boolean(id));

  void notifyTeamMemberInvitations(
    input.tournament,
    input.registrationId,
    input.captainUserId,
    input.teamName,
    linkedIds,
  );

  const pendingRows = await db
    .select({
      id: tournamentTeamMembers.id,
      email: tournamentTeamMembers.pendingEmail,
      displayName: tournamentTeamMembers.pendingDisplayName,
      claimExpiresAt: tournamentTeamMembers.claimExpiresAt,
      inviteSentAt: tournamentTeamMembers.inviteSentAt,
    })
    .from(tournamentTeamMembers)
    .where(
      and(
        eq(tournamentTeamMembers.teamId, input.teamId),
        isNotNull(tournamentTeamMembers.pendingEmail),
        isNull(tournamentTeamMembers.userId),
      ),
    );

  if (!pendingRows.length) return;

  const captainName = await loadCaptainName(input.captainUserId);

  for (const row of pendingRows) {
    if (!row.email || !row.displayName) continue;

    const token = generateRosterClaimToken();
    const claimTokenHash = hashRosterClaimToken(token);

    await db
      .update(tournamentTeamMembers)
      .set({
        claimTokenHash,
        inviteSentAt: new Date(),
      })
      .where(eq(tournamentTeamMembers.id, row.id));

    const claimUrl = buildRosterClaimUrl({
      sportSlug: input.tournament.sportSlug,
      slug: input.tournament.slug,
      token,
    });

    void sendTemplatedEmail({
      to: row.email,
      template: "registration-roster-claim",
      data: {
        appName: siteConfig.name,
        userName: row.displayName,
        captainName,
        tournamentName: input.tournament.name,
        teamName: input.teamName,
        sportName: input.tournament.sportName,
        inviteEmail: row.email,
        claimUrl,
        expiresAtFormatted: formatExpiry(row.claimExpiresAt),
      },
    }).then((result) => {
      if (!result.ok) {
        log.warn("Roster claim email failed", {
          memberId: row.id,
          registrationId: input.registrationId,
          error: result.error,
        });
      }
    });
  }
}
