import { nextPowerOfTwo } from "@/lib/tournaments/double-stage/allocate-groups";
import {
  BESTIE_CUP_R16_GROUP_PAIRS,
  parseGroupLetter,
} from "@/lib/tournaments/partner/bestie-cup-config";

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

/**
 * Default double-stage R1: same group rank, different groups
 * (1st vs 1st, then 2nd vs 2nd). Leftovers pair across ranks, still avoiding
 * same-group when possible. Hosts can swap afterwards.
 */
export function pairSameRankAcrossGroups(teams: SeededTeam[]): [SeededTeam, SeededTeam][] {
  const ranks = [...new Set(teams.map((t) => t.groupRank))].sort((a, b) => a - b);
  const pairs: [SeededTeam, SeededTeam][] = [];
  const leftovers: SeededTeam[] = [];

  for (const rank of ranks) {
    const pool = teams
      .filter((t) => t.groupRank === rank)
      .sort((a, b) => globalSeedScore(a) - globalSeedScore(b));
    const used = new Set<string>();
    for (let i = 0; i < pool.length; i += 1) {
      const a = pool[i]!;
      if (used.has(a.teamId)) continue;
      let partner: SeededTeam | undefined;
      for (let j = i + 1; j < pool.length; j += 1) {
        const b = pool[j]!;
        if (used.has(b.teamId)) continue;
        if (b.groupId !== a.groupId) {
          partner = b;
          break;
        }
      }
      if (partner) {
        pairs.push([a, partner]);
        used.add(a.teamId);
        used.add(partner.teamId);
      } else {
        leftovers.push(a);
        used.add(a.teamId);
      }
    }
  }

  const rest = [...leftovers];
  while (rest.length >= 2) {
    const a = rest.shift()!;
    const idx = rest.findIndex((b) => b.groupId !== a.groupId);
    const partner = idx >= 0 ? rest.splice(idx, 1)[0]! : rest.shift()!;
    pairs.push([a, partner]);
  }

  return pairs;
}

function spreadMatchIndexes(matchCount: number): number[] {
  const evens: number[] = [];
  const odds: number[] = [];
  for (let i = 0; i < matchCount; i += 1) {
    (i % 2 === 0 ? evens : odds).push(i);
  }
  return [...evens, ...odds];
}

/** Slot list of length `bracketSize` (A,B per match) for round-one seeding. */
export function buildCrossGroupRoundOneSlotOrder(
  teams: SeededTeam[],
  bracketSize: number,
): (SeededTeam | null)[] {
  const size = Math.max(2, bracketSize);
  const slots: (SeededTeam | null)[] = Array.from({ length: size }, () => null);
  const pairedIds = new Set<string>();
  const pairs = pairSameRankAcrossGroups(teams);
  const matchCount = size / 2;
  const matchIndexes = spreadMatchIndexes(matchCount);

  pairs.forEach((pair, i) => {
    const mi = matchIndexes[i];
    if (mi == null) return;
    slots[mi * 2] = pair[0];
    slots[mi * 2 + 1] = pair[1];
    pairedIds.add(pair[0].teamId);
    pairedIds.add(pair[1].teamId);
  });

  for (const team of teams) {
    if (pairedIds.has(team.teamId)) continue;
    const empty = slots.findIndex((s) => s == null);
    if (empty < 0) break;
    slots[empty] = team;
  }

  return slots;
}

/**
 * Bestie Cup fixed R16: A–I, B–J, …, H–P (pool winners only).
 */
export function buildBestieCupRoundOneSlotOrder(
  teams: SeededTeam[],
  bracketSize: number,
): (SeededTeam | null)[] {
  const size = Math.max(2, bracketSize);
  const slots: (SeededTeam | null)[] = Array.from({ length: size }, () => null);
  const winners = teams.filter((t) => t.groupRank === 1);
  const byLetter = new Map<string, SeededTeam>();
  for (const t of winners) {
    const letter = parseGroupLetter(t.groupName);
    if (letter) byLetter.set(letter, t);
  }

  const matchCount = size / 2;
  for (let i = 0; i < BESTIE_CUP_R16_GROUP_PAIRS.length && i < matchCount; i++) {
    const [left, right] = BESTIE_CUP_R16_GROUP_PAIRS[i]!;
    slots[i * 2] = byLetter.get(left) ?? null;
    slots[i * 2 + 1] = byLetter.get(right) ?? null;
  }

  const placed = new Set(slots.filter(Boolean).map((t) => t!.teamId));
  for (const t of winners) {
    if (placed.has(t.teamId)) continue;
    const empty = slots.findIndex((s) => s == null);
    if (empty < 0) break;
    slots[empty] = t;
    placed.add(t.teamId);
  }

  return slots;
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
  return pairSameRankAcrossGroups(teams);
}
