import type { TournamentType } from "@/db/schema/tournaments";
import type { AppRole } from "@/lib/roles/constants";
import { hasPermission } from "@/lib/roles/permissions";

export function canCreateOfficialTournament(roles: AppRole[]): boolean {
  return (
    roles.includes("super_admin") ||
    roles.includes("host") ||
    hasPermission(roles, "admin.wiki.manage")
  );
}

export function canCreateReclubTournament(roles: AppRole[]): boolean {
  return roles.length > 0;
}

export function allowedTournamentTypesForRoles(roles: AppRole[]): TournamentType[] {
  const types: TournamentType[] = ["recreational"];
  if (canCreateOfficialTournament(roles)) {
    types.unshift("official");
  }
  return types;
}

export function assertCanCreateTournamentType(
  roles: AppRole[],
  tournamentType: TournamentType,
): void {
  if (tournamentType === "official" && !canCreateOfficialTournament(roles)) {
    throw new Error("Only hosts and administrators can create official paid tournaments.");
  }
  if (tournamentType === "recreational" && !canCreateReclubTournament(roles)) {
    throw new Error("You must be signed in to create a reclub tournament.");
  }
}

export function canManageTournament(
  roles: AppRole[],
  createdByUserId: string | null,
  currentUserId: string,
): boolean {
  if (roles.includes("super_admin") || hasPermission(roles, "admin.wiki.manage")) {
    return true;
  }
  if (roles.includes("host") && createdByUserId === currentUserId) {
    return true;
  }
  return createdByUserId === currentUserId;
}
