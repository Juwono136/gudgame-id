import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getServerSession } from "@/lib/auth/session";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { getActiveReclubMatch, listReclubMatches } from "@/lib/tournaments/reclub/matches";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { AppError } from "@/lib/errors";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getUserRoleAssignments } from "@/lib/roles/sync";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (tournament.tournamentType !== "recreational") {
      throw new AppError("Lobby is only available for reclub tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    const session = await getServerSession();
    const userId = session?.user?.id ?? null;
    const roles = userId ? await getUserRoleAssignments(userId) : [];

    const [summary, teams, matches, activeMatch, userTeamId] = await Promise.all([
      getRegistrationSummary(
        tournament.id,
        tournament.maxTeams,
        tournament.registrationClosesAt
          ? new Date(tournament.registrationClosesAt)
          : null,
        tournament.registrationOpensAt
          ? new Date(tournament.registrationOpensAt)
          : null,
        tournament.startsAt ? new Date(tournament.startsAt) : null,
      ),
      listLobbyTeamsDetailed(tournament.id),
      listReclubMatches(tournament.id),
      getActiveReclubMatch(tournament.id),
      userId ? getUserTeamInTournament(tournament.id, userId) : Promise.resolve(null),
    ]);

    const canManage = userId
      ? canManageTournament(roles, tournament.createdBy, userId)
      : false;

    return jsonSuccess({
      userId,
      tournament: {
        id: tournament.id,
        sportSlug: tournament.sportSlug,
        slug: tournament.slug,
        name: tournament.name,
        status: tournament.status,
        playersPerTeam: tournament.playersPerTeam,
        maxTeams: tournament.maxTeams,
      },
      summary,
      teams,
      matches,
      activeMatch,
      userTeamId,
      canManage,
      isAuthenticated: Boolean(userId),
    });
  } catch (error) {
    return jsonError(error);
  }
}
