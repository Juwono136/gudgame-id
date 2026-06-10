import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentRegistrations,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import type { AppRole } from "@/lib/roles/constants";
import {
  getTournamentBySlug,
  type TournamentDetail,
  type TournamentListItem,
} from "@/lib/tournaments/service";
import { listReclubMatches, type ReclubMatchView } from "@/lib/tournaments/reclub/matches";
import { listLobbyTeamsDetailed, type LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";

export type HostTournamentWorkspace = {
  tournament: TournamentDetail;
  summary: Awaited<ReturnType<typeof getRegistrationSummary>>;
  teams: LobbyTeamView[];
  matches: ReclubMatchView[];
  registrations: {
    id: number;
    status: string;
    teamName: string | null;
    registeredByName: string;
    paymentStatus: string | null;
    amountIdr: number | null;
  }[];
  revenue: {
    totalCollectedIdr: number;
    platformFeesIdr: number;
    hostPayoutIdr: number;
  };
};

export async function listHostTournaments(
  userId: string,
  sportId?: number,
): Promise<TournamentListItem[]> {
  const db = getDb();
  const conditions = [eq(tournaments.createdBy, userId)];
  if (sportId) conditions.push(eq(tournaments.sportId, sportId));

  const rows = await db
    .select({
      id: tournaments.id,
      sportId: tournaments.sportId,
      sportSlug: sports.slug,
      sportName: sports.name,
      slug: tournaments.slug,
      name: tournaments.name,
      summary: tournaments.summary,
      status: tournaments.status,
      tournamentType: tournaments.tournamentType,
      venue: tournaments.venue,
      categoryLabel: tournaments.categoryLabel,
      registrationFeeIdr: tournaments.registrationFeeIdr,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      updatedAt: tournaments.updatedAt,
    })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(...conditions))
    .orderBy(desc(tournaments.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    sportId: r.sportId,
    sportSlug: r.sportSlug,
    sportName: r.sportName,
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    status: r.status as TournamentListItem["status"],
    tournamentType: r.tournamentType as TournamentListItem["tournamentType"],
    venue: r.venue,
    categoryLabel: r.categoryLabel,
    registrationFeeIdr: r.registrationFeeIdr,
    startsAt: r.startsAt?.toISOString() ?? null,
    endsAt: r.endsAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getTournamentById(id: number): Promise<TournamentDetail | null> {
  const [row] = await getDb()
    .select({ sportSlug: sports.slug, slug: tournaments.slug })
    .from(tournaments)
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournaments.id, id))
    .limit(1);

  if (!row) return null;
  return getTournamentBySlug(row.sportSlug, row.slug);
}

export async function getHostTournamentWorkspace(
  tournamentId: number,
  userId: string,
  roles: AppRole[],
): Promise<HostTournamentWorkspace> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
  }

  const summary = await getRegistrationSummary(
    tournament.id,
    tournament.maxTeams,
    tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt) : null,
    tournament.registrationOpensAt ? new Date(tournament.registrationOpensAt) : null,
    tournament.startsAt ? new Date(tournament.startsAt) : null,
  );

  const teams = await listLobbyTeamsDetailed(tournament.id);
  const matches = await listReclubMatches(tournament.id);

  const regRows = await getDb()
    .select({
      id: tournamentRegistrations.id,
      status: tournamentRegistrations.status,
      teamName: tournamentTeams.name,
      registeredByName: user.name,
      paymentStatus: tournamentPayments.status,
      amountIdr: tournamentPayments.amountIdr,
    })
    .from(tournamentRegistrations)
    .innerJoin(user, eq(tournamentRegistrations.registeredByUserId, user.id))
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(eq(tournamentRegistrations.tournamentId, tournament.id))
    .orderBy(desc(tournamentRegistrations.createdAt));

  const paidRows = await getDb()
    .select({
      amount: tournamentPayments.amountIdr,
      platform: tournamentPayments.platformFeeIdr,
      host: tournamentPayments.hostPayoutIdr,
    })
    .from(tournamentPayments)
    .where(
      and(
        eq(tournamentPayments.tournamentId, tournament.id),
        eq(tournamentPayments.status, "paid"),
      ),
    );

  let totalCollectedIdr = 0;
  let platformFeesIdr = 0;
  let hostPayoutIdr = 0;
  for (const p of paidRows) {
    totalCollectedIdr += p.amount;
    platformFeesIdr += p.platform;
    hostPayoutIdr += p.host;
  }

  return {
    tournament,
    summary,
    teams,
    matches,
    registrations: regRows.map((r) => ({
      id: r.id,
      status: r.status,
      teamName: r.teamName,
      registeredByName: r.registeredByName,
      paymentStatus: r.paymentStatus,
      amountIdr: r.amountIdr,
    })),
    revenue: { totalCollectedIdr, platformFeesIdr, hostPayoutIdr },
  };
}

export async function updateTournamentStatus(
  tournamentId: number,
  userId: string,
  roles: AppRole[],
  status: TournamentDetail["status"],
): Promise<TournamentDetail> {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
  }

  await getDb()
    .update(tournaments)
    .set({ status })
    .where(eq(tournaments.id, tournamentId));

  const updated = await getTournamentById(tournamentId);
  if (!updated) {
    throw new AppError("Update failed", { code: "DATABASE_ERROR", statusCode: 500 });
  }
  return updated;
}
