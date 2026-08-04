import { nextPowerOfTwo } from "@/lib/tournaments/double-stage/allocate-groups";

export type QualifiedTeam = {
  teamId: string;
  teamName: string;
  groupId: string;
  groupName: string;
  groupRank: number;
  points: number;
  wins: number;
  scoreDiff: number;
  scoreFor: number;
};

export type SeededTeam = QualifiedTeam & {
  globalSeed: number;
};

/** Standard bracket pairing order for power-of-2 (1v16, 8v9, …). */
export function standardBracketPairings(bracketSize: number): [number, number][] {
  function bracketSeedOrder(size: number): number[] {
    if (size <= 2) return [1, 2];
    const half = bracketSeedOrder(size / 2);
    const out: number[] = [];
    for (const seed of half) {
      out.push(seed);
      out.push(size + 1 - seed);
    }
    return out;
  }
  const order = bracketSeedOrder(bracketSize);
  const pairs: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairs.push([order[i]!, order[i + 1]!]);
  }
  return pairs;
}

function globalSeedScore(team: QualifiedTeam): number {
  return (
    team.groupRank * 1_000_000 -
    team.points * 10_000 -
    team.wins * 1_000 -
    team.scoreDiff * 10 -
    team.scoreFor
  );
}

export function assignGlobalSeeds(qualified: QualifiedTeam[]): SeededTeam[] {
  const sorted = [...qualified].sort((a, b) => globalSeedScore(a) - globalSeedScore(b));
  return sorted.map((t, i) => ({ ...t, globalSeed: i + 1 }));
}

function sameGroupConflict(a: SeededTeam, b: SeededTeam): boolean {
  return a.groupId === b.groupId;
}

/** Swap seeds in pairings to reduce same-group R1 matchups when possible. */
export function optimizePairingsAvoidSameGroup(
  seeded: SeededTeam[],
  bracketSize: number,
): Map<number, SeededTeam> {
  const seedMap = new Map<number, SeededTeam>();
  for (const t of seeded) seedMap.set(t.globalSeed, t);

  const pairings = standardBracketPairings(bracketSize);
  const assigned = new Map<number, SeededTeam>();
  const used = new Set<number>();

  for (const [s1, s2] of pairings) {
    const team1 = seedMap.get(s1);
    let team2 = seedMap.get(s2);

    if (team1 && team2 && sameGroupConflict(team1, team2)) {
      for (const alt of seeded) {
        if (used.has(alt.globalSeed) || alt.globalSeed === s1) continue;
        if (!sameGroupConflict(team1, alt)) {
          team2 = alt;
          break;
        }
      }
    }

    if (team1 && !used.has(team1.globalSeed)) {
      assigned.set(s1, team1);
      used.add(team1.globalSeed);
    }
    if (team2 && !used.has(team2.globalSeed)) {
      assigned.set(s2, team2);
      used.add(team2.globalSeed);
    }
  }

  for (const t of seeded) {
    if (!used.has(t.globalSeed)) {
      for (let slot = 1; slot <= bracketSize; slot++) {
        if (!assigned.has(slot)) {
          assigned.set(slot, t);
          used.add(t.globalSeed);
          break;
        }
      }
    }
  }

  return assigned;
}

export type PlayInPlan = {
  bracketSize: number;
  byeCount: number;
  playInMatchCount: number;
  byeTeams: SeededTeam[];
  playInTeams: SeededTeam[];
};

export function planPlayInAndByes(seeded: SeededTeam[]): PlayInPlan {
  const n = seeded.length;
  const bracketSize = nextPowerOfTwo(Math.max(2, n));
  const byeCount = bracketSize - n;

  // Power-of-two field — every team starts in round 1 (no play-in round).
  // Without this guard, playInMatchCount becomes n/2 and R1 is also fully seeded,
  // so the same pairings are played twice before the bracket advances.
  if (byeCount === 0) {
    return {
      bracketSize,
      byeCount: 0,
      playInMatchCount: 0,
      byeTeams: seeded,
      playInTeams: [],
    };
  }

  const playInTeamCount = n - byeCount;
  const playInMatchCount = playInTeamCount / 2;
  const byeTeams = seeded.slice(0, byeCount);
  const playInTeamsList = seeded.slice(byeCount);

  return {
    bracketSize,
    byeCount,
    playInMatchCount,
    byeTeams,
    playInTeams: playInTeamsList,
  };
}

export function pairPlayInTeams(teams: SeededTeam[]): [SeededTeam, SeededTeam][] {
  const pairs: [SeededTeam, SeededTeam][] = [];
  const sorted = [...teams].sort((a, b) => a.globalSeed - b.globalSeed);
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    pairs.push([sorted[left]!, sorted[right]!]);
    left++;
    right--;
  }
  return pairs;
}
