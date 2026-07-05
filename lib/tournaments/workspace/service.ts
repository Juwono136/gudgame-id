import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { normalizeTournamentType } from "@/lib/tournaments/core/types";
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
    id: string; status: string;
    teamName: string | null;
    registeredByName: string;
    registeredByUserId: string;
    paymentStatus: string | null;
    amountIdr: number | null;
    confirmedAt: string | null;
    paymentDueAt: string | null;
    members: { userId: string; displayName: string; role: string }[];
  }[];
  revenue: {
    totalCollectedIdr: number;
    platformFeesIdr: number;
    hostPayoutIdr: number;
  };
};

export async function listHostTournaments(
  userId: string,
  sportId?: string,
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
      officialBilling: tournaments.officialBilling,
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
    tournamentType: normalizeTournamentType(r.tournamentType) as TournamentListItem["tournamentType"],
    officialBilling: (r.officialBilling as TournamentListItem["officialBilling"]) ?? null,
    venue: r.venue,
    categoryLabel: r.categoryLabel,
    registrationFeeIdr: r.registrationFeeIdr,
    startsAt: r.startsAt?.toISOString() ?? null,
    endsAt: r.endsAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getTournamentById(id: string): Promise<TournamentDetail | null> {
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
  tournamentId: string,
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
    normalizeTournamentType(tournament.tournamentType),
    tournament.officialBilling,
  );

  const teams = await listLobbyTeamsDetailed(tournament.id);
  const matches = await listReclubMatches(tournament.id);

  const regRows = await getDb()
    .select({
      id: tournamentRegistrations.id,
      status: tournamentRegistrations.status,
      teamId: tournamentRegistrations.teamId,
      teamName: tournamentTeams.name,
      registeredByName: user.name,
      registeredByUserId: tournamentRegistrations.registeredByUserId,
      paymentStatus: tournamentPayments.status,
      amountIdr: tournamentPayments.amountIdr,
      confirmedAt: tournamentRegistrations.confirmedAt,
      paymentDueAt: tournamentRegistrations.paymentDueAt,
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

  const teamIds = regRows
    .map((r) => r.teamId)
    .filter((id): id is string => id != null);

  const memberRows = teamIds.length
    ? await getDb()
        .select({
          teamId: tournamentTeamMembers.teamId,
          userId: tournamentTeamMembers.userId,
          role: tournamentTeamMembers.role,
          displayName: user.name,
        })
        .from(tournamentTeamMembers)
        .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
        .where(inArray(tournamentTeamMembers.teamId, teamIds))
    : [];

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
      registeredByUserId: r.registeredByUserId,
      paymentStatus: r.paymentStatus,
      amountIdr: r.amountIdr,
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
      paymentDueAt: r.paymentDueAt?.toISOString() ?? null,
      members: memberRows
        .filter((m) => m.teamId === r.teamId)
        .map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          role: m.role,
        })),
    })),
    revenue: { totalCollectedIdr, platformFeesIdr, hostPayoutIdr },
  };
}

export async function updateTournamentStatus(
  tournamentId: string,
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

  if (tournament.tournamentType === "official") {
    throw new AppError(
      "Official tournament status is set automatically from the event schedule.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  await getDb()
    .update(tournaments)
    .set({ status })
    .where(eq(tournaments.id, tournamentId));

  if (status === "completed" || status === "cancelled") {
    const { finalizeStaleActiveMatches } = await import(
      "@/lib/tournaments/lifecycle/finalize-active-matches"
    );
    await finalizeStaleActiveMatches(
      tournamentId,
      status === "cancelled" ? "cancelled" : "completed",
    );
  }

  const updated = await getTournamentById(tournamentId);
  if (!updated) {
    throw new AppError("Update failed", { code: "DATABASE_ERROR", statusCode: 500 });
  }
  return updated;
}
