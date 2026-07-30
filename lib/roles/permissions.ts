import type { AppRole } from "@/lib/roles/constants";
import {
  isAppRole,
  MASTER_CONSOLE_ROLES,
  USER_MANAGEMENT_ROLES,
} from "@/lib/roles/constants";

export type Permission =
  | "admin.console.access"
  | "admin.users.manage"
  | "admin.sports.manage"
  | "admin.wiki.manage"
  | "admin.content.moderate";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  player: [],
  host: ["admin.content.moderate"],
  partner: [],
  super_admin: [
    "admin.console.access",
    "admin.users.manage",
    "admin.sports.manage",
    "admin.wiki.manage",
    "admin.content.moderate",
  ],
};

export function getPermissionsForRoles(roles: AppRole[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) {
      set.add(p);
    }
  }
  return set;
}

export function hasPermission(roles: AppRole[], permission: Permission): boolean {
  return getPermissionsForRoles(roles).has(permission);
}

export function canAccessAdminConsole(roles: AppRole[]): boolean {
  return roles.some((r) => MASTER_CONSOLE_ROLES.includes(r));
}

export function canAccessHostWorkspace(roles: AppRole[]): boolean {
  return roles.includes("host");
}

export function canManageUsers(roles: AppRole[]): boolean {
  return roles.some((r) => USER_MANAGEMENT_ROLES.includes(r));
}

export function parseRolesFromStrings(values: string[]): AppRole[] {
  const unique = new Set<AppRole>();
  for (const v of values) {
    if (isAppRole(v)) unique.add(v);
  }
  return [...unique];
}
