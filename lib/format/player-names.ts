/** Deduplicated player names for display (comma-separated, no middle-dot separators). */
export function uniquePlayerNames(names: string[] | undefined | null): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names ?? []) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function formatPlayerNameList(names: string[] | undefined | null): string {
  return uniquePlayerNames(names).join(", ");
}

export function isSyntheticLineupUserId(userId: string): boolean {
  return userId.startsWith("lineup-");
}
