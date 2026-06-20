import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { canAccessHostDashboard } from "@/lib/roles/route-access";
export type TournamentEditWorkspace = "host" | "player";

export function resolveTournamentEditWorkspace(
  roles: AppRole[],
  options?: { preferHost?: boolean; tournamentType?: string },
): TournamentEditWorkspace {
  if (options?.preferHost && roles.includes("host")) return "host";
  if (options?.tournamentType === "official" && roles.includes("host")) return "host";
  if (roles.includes("host") && !roles.includes("player")) return "host";
  return "player";
}

export function tournamentEditUrl(
  id: string,
  workspace: TournamentEditWorkspace = "player",
): string {
  return workspace === "host"
    ? dashboardRoutes.hostTournamentEdit(id)
    : dashboardRoutes.tournamentEdit(id);
}

export function tournamentListUrl(workspace: TournamentEditWorkspace): string {
  return workspace === "host" ? dashboardRoutes.hostTournaments : dashboardRoutes.tournaments;
}

export function tournamentDeniedRedirect(roles: AppRole[]): string {
  if (roles.includes("host")) return dashboardRoutes.hostTournaments;
  return dashboardRoutes.tournaments;
}

export function tournamentAfterSaveUrl(
  workspace: TournamentEditWorkspace,
  tournamentId?: string,
): string {
  if (workspace === "host") {
    // After editing, returning to the list is less confusing than jumping into workspace.
    // Workspace remains accessible from the tournament card row click.
    return dashboardRoutes.hostTournaments;
  }
  return dashboardRoutes.tournaments;
}

export function resolveReclubCreateWorkspace(roles: AppRole[]): TournamentEditWorkspace {
  return canAccessHostDashboard(roles) ? "host" : "player";
}

export function tournamentAfterCreateUrl(
  workspace: TournamentEditWorkspace,
  tournament: { id: string; sportSlug: string; slug: string },
): string {
  if (workspace === "host") {
    return dashboardRoutes.hostTournament(tournament.id);
  }
  return dashboardRoutes.tournament(tournament.id);
}
