import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { listBracketMatches } from "@/lib/tournaments/brackets/service";
import { getTeamsInActiveBracketMatches } from "@/lib/tournaments/brackets/active-teams";
import { provisionTournamentCourts } from "@/lib/tournaments/courts/service";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { getRegistrationSummary } from "@/lib/tournaments/registration/service";
import { getActiveReclubMatches, listReclubMatches } from "@/lib/tournaments/reclub/matches";
import { listLobbyTeamsDetailed } from "@/lib/tournaments/reclub/teams";
import { isFunMatchType, normalizeTournamentType } from "@/lib/tournaments/core/types";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { AppError } from "@/lib/errors";
import { computeManageWorkspaceStats } from "@/lib/tournaments/stats/from-manage-workspace";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    await assertTournamentManagePageAccess(tournament, userId, roles);

    const courts = await provisionTournamentCourts(tournament);

    const isElimination = tournament.format !== "americano";
    const isFunMatch = isFunMatchType(tournament.tournamentType);

    const [teams, reclubMatches, activeReclubMatches, bracketMatches, summary, teamsInActiveBracket] =
      await Promise.all([
        listLobbyTeamsDetailed(tournament.id),
        isElimination && !isFunMatch ? Promise.resolve([]) : listReclubMatches(tournament.id),
        isElimination && !isFunMatch ? Promise.resolve([]) : getActiveReclubMatches(tournament.id),
        isElimination ? listBracketMatches(tournament.id) : Promise.resolve([]),
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
          normalizeTournamentType(tournament.tournamentType),
          tournament.officialBilling,
        ),
        isElimination ? getTeamsInActiveBracketMatches(tournament.id) : Promise.resolve([]),
      ]);

    const activeBracketMatches = bracketMatches.filter((m) => m.status === "in_progress");

    const sessionStats: TournamentSessionStats = computeManageWorkspaceStats({
      tournament,
      teams,
      reclubMatches,
      bracketMatches,
      summary,
    });

    return jsonSuccess({
      mode: isElimination ? "bracket" : "rounds",
      courts,
      teams,
      reclubMatches,
      activeReclubMatches,
      bracketMatches,
      activeBracketMatches,
      summary,
      teamsInActiveBracket,
      sessionStats,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        tournamentType: tournament.tournamentType,
        playersPerTeam: tournament.playersPerTeam,
        maxTeams: tournament.maxTeams,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
