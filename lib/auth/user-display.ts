/** Display labels for Better Auth `user.role` values */
const ROLE_LABELS: Record<string, string> = {
  player: "Player",
  admin: "Super Admin",
  super_admin: "Super Admin",
  editor: "Contributor",
  contributor: "Contributor",
  moderator: "Moderator",
};

export function formatUserRole(role: string | null | undefined): string {
  if (!role?.trim()) return ROLE_LABELS.player;
  const key = role.trim().toLowerCase();
  return ROLE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function getRoleFromUser(user: { role?: string | null }): string {
  return formatUserRole(user.role);
}

export type ProfileHandle = {
  /** Primary line in profile dropdown (nickname preferred) */
  handle: string;
  /** True when showing a registered nickname */
  isNickname: boolean;
};

/**
 * Short label for profile UI — nickname when set, otherwise email local-part.
 * Avoids long legal names in compact navbar dropdowns.
 */
export function getProfileHandle(user: {
  nickname?: string | null;
  email?: string;
}): ProfileHandle {
  const nick = user.nickname?.trim();
  if (nick) {
    return { handle: nick, isNickname: true };
  }

  const localPart = user.email?.split("@")[0]?.trim();
  if (localPart) {
    return { handle: localPart, isNickname: false };
  }

  return { handle: "player", isNickname: false };
}
