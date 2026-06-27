import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
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
  tournament?: { sportSlug: string; slug: string },
): string {
  if (tournament) {
    return publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  }
  return tournamentListUrl(workspace);
}

export function resolveReclubCreateWorkspace(roles: AppRole[]): TournamentEditWorkspace {
  return canAccessHostDashboard(roles) ? "host" : "player";
}

export function tournamentAfterCreateUrl(
  workspace: TournamentEditWorkspace,
  tournament: { id: string; sportSlug: string; slug: string },
): string {
  return `${publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}?created=1`;
}
