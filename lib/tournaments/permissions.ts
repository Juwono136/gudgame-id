import type { AppRole } from "@/lib/roles/constants";
import { hasPermission } from "@/lib/roles/permissions";
import { AppError } from "@/lib/errors";
import type { OfficialBillingType, TournamentType } from "@/db/schema/tournaments";
import {
  isFunMatchType,
  isOfficialType,
  normalizeTournamentType,
} from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";

export function canCreateOfficialTournament(roles: AppRole[]): boolean {
  return (
    roles.includes("super_admin") ||
    roles.includes("host") ||
    hasPermission(roles, "admin.wiki.manage")
  );
}

export function canCreateFunMatchTournament(_roles: AppRole[]): boolean {
  return _roles.length > 0;
}

export function allowedTournamentTypesForRoles(roles: AppRole[]): TournamentType[] {
  const types: TournamentType[] = ["fun_match"];
  if (canCreateOfficialTournament(roles)) {
    types.unshift("official");
  }
  return types;
}

export function assertCanCreateTournamentType(
  roles: AppRole[],
  tournamentType: string,
  officialBilling?: OfficialBillingType | null,
): void {
  const normalized = normalizeTournamentType(tournamentType);
  if (normalized === "official" && !canCreateOfficialTournament(roles)) {
    throw new AppError("Only hosts and administrators can create official tournaments.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  if (normalized === "fun_match" && !canCreateFunMatchTournament(roles)) {
    throw new AppError("You must be signed in to create a Fun Match tournament.", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }
  if (normalized === "official" && !officialBilling) {
    throw new AppError("Official tournaments require a billing type (paid or free).", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 422,
      context: { field: "officialBilling" },
    });
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

export type AccessGrantCapabilities = {
  canManageBracket: boolean;
  canManageScoring: boolean;
};

export function capabilitiesFromGrantRole(
  role: string | null | undefined,
): AccessGrantCapabilities {
  if (role === "bracket_manager") {
    return { canManageBracket: true, canManageScoring: true };
  }
  if (role === "scorekeeper") {
    return { canManageBracket: false, canManageScoring: true };
  }
  return { canManageBracket: false, canManageScoring: false };
}

export function canManageBracketSetup(
  roles: AppRole[],
  tournament: TournamentDetail,
  currentUserId: string,
  grantRole?: string | null,
): boolean {
  if (canManageTournament(roles, tournament.createdBy, currentUserId)) {
    return true;
  }
  const caps = capabilitiesFromGrantRole(grantRole);
  return caps.canManageBracket;
}

export function canManageLiveScoring(
  roles: AppRole[],
  tournament: TournamentDetail,
  currentUserId: string,
  grantRole?: string | null,
): boolean {
  if (canManageTournament(roles, tournament.createdBy, currentUserId)) {
    return true;
  }
  const caps = capabilitiesFromGrantRole(grantRole);
  return caps.canManageScoring;
}

/** @deprecated Use canManageLiveScoring with grant lookup */
export function canManageOfficialBracketRuntime(
  roles: AppRole[],
  tournament: TournamentDetail,
  currentUserId: string,
  grantRole?: string | null,
): boolean {
  if (!isOfficialType(tournament.tournamentType)) {
    return canManageLiveScoring(roles, tournament, currentUserId, grantRole);
  }
  return canManageLiveScoring(roles, tournament, currentUserId, grantRole);
}

export function canManageFunMatchRuntime(
  roles: AppRole[],
  tournament: TournamentDetail,
  currentUserId: string,
  grantRole?: string | null,
): boolean {
  if (!isFunMatchType(tournament.tournamentType)) {
    return false;
  }
  return canManageLiveScoring(roles, tournament, currentUserId, grantRole);
}
