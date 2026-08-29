/** Prefer real name over nickname for scorekeeper labels (TV / manage / public). */
export function formatScorekeeperDisplayName(
  name: string | null | undefined,
  nickname: string | null | undefined,
): string {
  const full = name?.trim();
  if (full) return full;
  const nick = nickname?.trim();
  if (nick) return nick;
  return "Scorekeeper";
}

export function scorekeeperLabelFromMap(
  map: Map<string, string>,
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  return map.get(userId) ?? null;
}
