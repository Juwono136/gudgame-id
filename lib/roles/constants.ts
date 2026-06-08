/**
 * Application roles — extend this list when adding new role types.
 * `viewer` is anonymous-only and never stored in user_role_assignments.
 */
export const APP_ROLES = [
  "player",
  "contributor",
  "super_admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Roles that can access the Master Console (/admin) — super admin only */
export const MASTER_CONSOLE_ROLES: AppRole[] = ["super_admin"];

/** @deprecated Use MASTER_CONSOLE_ROLES — kept for migrations */
export const ADMIN_CONSOLE_ROLES: AppRole[] = MASTER_CONSOLE_ROLES;

/** Roles allowed to manage users */
export const USER_MANAGEMENT_ROLES: AppRole[] = ["super_admin"];

export const ROLE_LABELS: Record<AppRole, string> = {
  player: "Player",
  contributor: "Contributor",
  super_admin: "Super Admin",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  player: "Community member with profile, clubs, and tournaments",
  contributor: "Can edit wiki content; articles require moderation",
  super_admin: "Full platform control, user management, and moderation",
};

/** Legacy values synced from older single `user.role` column */
export const LEGACY_ROLE_MAP: Record<string, AppRole> = {
  player: "player",
  contributor: "contributor",
  editor: "contributor",
  admin: "super_admin",
  super_admin: "super_admin",
  moderator: "contributor",
};

export const DEFAULT_REGISTRATION_ROLES: AppRole[] = ["player"];

export const ACTIVE_ROLE_COOKIE = "cp-active-role";
export const ADMIN_SPORT_COOKIE = "cp-admin-sport";

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeLegacyRole(value: string | null | undefined): AppRole | null {
  if (!value?.trim()) return null;
  const key = value.trim().toLowerCase();
  return LEGACY_ROLE_MAP[key] ?? (isAppRole(key) ? key : null);
}

export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}

/** Highest-privilege role for legacy `user.role` column sync */
const ROLE_PRIORITY: Record<AppRole, number> = {
  player: 0,
  contributor: 1,
  super_admin: 2,
};

export function pickPrimaryRole(roles: AppRole[]): AppRole {
  if (roles.length === 0) return "player";
  return roles.reduce((best, r) =>
    ROLE_PRIORITY[r] > ROLE_PRIORITY[best] ? r : best,
  );
}
