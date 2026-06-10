import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentRegistrations, tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { sendTemplatedEmail } from "@/lib/email/send";
import { publicSportRoutes } from "@/lib/constants/routes";
import { siteConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

function memberDisplayName(member: {
  name: string | null;
  fullNameKtp: string | null;
}): string {
  return member.fullNameKtp?.trim() || member.name?.trim() || "Player";
}

const log = logger.child({ module: "registration-notify" });

function formatDateRange(starts: Date | null, ends: Date | null): string {
  if (!starts) return "Date TBA";
  const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
  if (!ends) return fmt.format(starts);
  return `${fmt.format(starts)} – ${fmt.format(ends)}`;
}

function formatIdr(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function sendRegistrationConfirmedEmails(
  registrationId: number,
  appOrigin: string,
): Promise<void> {
  const db = getDb();

  const [row] = await db
    .select({
      registrationId: tournamentRegistrations.id,
      teamId: tournamentRegistrations.teamId,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      slug: tournaments.slug,
      sportSlug: sports.slug,
      sportName: sports.name,
      venue: tournaments.venue,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      registrationFeeIdr: tournaments.registrationFeeIdr,
      teamName: tournamentTeams.name,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .innerJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .where(eq(tournamentRegistrations.id, registrationId))
    .limit(1);

  if (!row?.teamId) return;

  const members = await db
    .select({
      userId: tournamentTeamMembers.userId,
      email: user.email,
      name: user.name,
      fullNameKtp: user.fullNameKtp,
    })
    .from(tournamentTeamMembers)
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(eq(tournamentTeamMembers.teamId, row.teamId));

  const tournamentUrl = `${appOrigin}${publicSportRoutes.tournament(row.sportSlug, row.slug)}`;
  const dateRange = formatDateRange(row.startsAt, row.endsAt);
  const feePaid = formatIdr(row.registrationFeeIdr);
  const teamMemberNames = members.map((m) => memberDisplayName(m));

  await Promise.all(
    members.map(async (member) => {
      if (!member.email) return;
      const result = await sendTemplatedEmail({
        to: member.email,
        template: "registration-confirmed",
        data: {
          appName: siteConfig.name,
          userName: memberDisplayName(member),
          tournamentName: row.tournamentName,
          teamName: row.teamName,
          sportName: row.sportName,
          venue: row.venue,
          dateRange,
          feePaid,
          teamMembers: teamMemberNames,
          tournamentUrl,
        },
      });
      if (!result.ok) {
        log.warn("Registration email failed", {
          registrationId,
          userId: member.userId,
          error: result.error,
        });
      }
    }),
  );
}
