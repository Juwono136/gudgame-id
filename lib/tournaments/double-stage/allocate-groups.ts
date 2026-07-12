export type GroupSizePlan = {
  groupCount: number;
  sizes: number[];
};

/**
 * Balanced group allocation: each group has at most maxPerGroup teams.
 * Example: 34 teams, max 4 → 9 groups: 7×4 + 2×3
 */
export function planBalancedGroups(teamCount: number, maxPerGroup = 4): GroupSizePlan {
  if (teamCount < 2) {
    return { groupCount: 1, sizes: [teamCount] };
  }
  const groupCount = Math.ceil(teamCount / maxPerGroup);
  const baseSize = Math.floor(teamCount / groupCount);
  const remainder = teamCount % groupCount;
  const sizes: number[] = [];
  for (let i = 0; i < groupCount; i++) {
    sizes.push(i < remainder ? baseSize + 1 : baseSize);
  }
  return { groupCount, sizes };
}

export function groupNameForIndex(index: number): string {
  return `Group ${String.fromCharCode(65 + index)}`;
}

/** Distribute team ids into groups following the size plan (snake draft for balance). */
export function distributeTeamsToGroups<T extends { id: string }>(
  teams: T[],
  maxPerGroup = 4,
): { name: string; teams: T[] }[] {
  const plan = planBalancedGroups(teams.length, maxPerGroup);
  const groups: { name: string; teams: T[] }[] = plan.sizes.map((_, i) => ({
    name: groupNameForIndex(i),
    teams: [],
  }));

  let teamIndex = 0;
  for (let round = 0; round < Math.max(...plan.sizes); round++) {
    const forward = round % 2 === 0;
    const indices = forward
      ? groups.map((_, i) => i)
      : groups.map((_, i) => groups.length - 1 - i);
    for (const gi of indices) {
      if (groups[gi]!.teams.length < plan.sizes[gi]! && teamIndex < teams.length) {
        groups[gi]!.teams.push(teams[teamIndex]!);
        teamIndex++;
      }
    }
  }

  return groups.filter((g) => g.teams.length > 0);
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
