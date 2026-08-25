import type { StandingsScoringConfig, TieBreakerKey } from "@/lib/tournaments/scoring/config";
import { matchWinRatePercent } from "@/lib/tournaments/stats/win-rate";

export type CompletedGroupMatch = {
  teamAId: string;
  teamBId: string;
  /** Public match score (sets won in classic mode, or games/points in short formats). */
  scoreA: number;
  scoreB: number;
  status: string;
  /** Optional set totals for true ITF set-win % (classic_sets). */
  setsA?: number;
  setsB?: number;
  /** Optional games won across all sets for game-win %. */
  gamesA?: number;
  gamesB?: number;
};

export type TeamStandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  points: number;
  /** Sets won/lost when classic set stats are present. */
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  /**
   * Match win rate % (wins ÷ played), one decimal.
   * Informational — ranking still uses points / tie-breakers.
   */
  winRate: number;
  rank: number;
  qualificationStatus: "pending" | "qualified" | "eliminated";
  needsManualResolution?: boolean;
};

type StandingCore = Omit<
  TeamStandingRow,
  "rank" | "qualificationStatus" | "needsManualResolution" | "winRate"
>;


function initStanding(teamId: string, teamName: string): StandingCore {
  return {
    teamId,
    teamName,
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    scoreFor: 0,
    scoreAgainst: 0,
    scoreDiff: 0,
    points: 0,
    setsFor: 0,
    setsAgainst: 0,
    gamesFor: 0,
    gamesAgainst: 0,
  };
}

/** Match-win percentage (ITF: used when sets aren't separately tracked as setWinPct fallback). */
export function matchWinPct(row: Pick<StandingCore, "wins" | "played">): number {
  return row.played > 0 ? row.wins / row.played : 0;
}

/** @deprecated alias — prefer matchWinPct; kept for callers expecting setWinPct name. */
export function setWinPct(row: Pick<StandingCore, "wins" | "played" | "setsFor" | "setsAgainst">): number {
  const setsPlayed = row.setsFor + row.setsAgainst;
  if (setsPlayed > 0) return row.setsFor / setsPlayed;
  return matchWinPct(row);
}

/** Games won percentage. */
export function gameWinPct(
  row: Pick<StandingCore, "scoreFor" | "scoreAgainst" | "gamesFor" | "gamesAgainst">,
): number {
  const gamesPlayed = row.gamesFor + row.gamesAgainst;
  if (gamesPlayed > 0) return row.gamesFor / gamesPlayed;
  return row.scoreFor / Math.max(1, row.scoreFor + row.scoreAgainst);
}

function applyMatchResult(
  standings: Map<string, StandingCore>,
  match: CompletedGroupMatch,
  config: StandingsScoringConfig,
): void {
  if (match.status !== "completed") return;
  const a = standings.get(match.teamAId);
  const b = standings.get(match.teamBId);
  if (!a || !b) return;

  a.played++;
  b.played++;
  a.scoreFor += match.scoreA;
  a.scoreAgainst += match.scoreB;
  b.scoreFor += match.scoreB;
  b.scoreAgainst += match.scoreA;
  a.scoreDiff = a.scoreFor - a.scoreAgainst;
  b.scoreDiff = b.scoreFor - b.scoreAgainst;

  const setsA = match.setsA ?? match.scoreA;
  const setsB = match.setsB ?? match.scoreB;
  a.setsFor += setsA;
  a.setsAgainst += setsB;
  b.setsFor += setsB;
  b.setsAgainst += setsA;

  const gamesA = match.gamesA ?? match.scoreA;
  const gamesB = match.gamesB ?? match.scoreB;
  a.gamesFor += gamesA;
  a.gamesAgainst += gamesB;
  b.gamesFor += gamesB;
  b.gamesAgainst += gamesA;

  if (match.scoreA === match.scoreB) {
    if (!config.allowDraw) return;
    a.draws++;
    b.draws++;
    a.points += config.drawPoints;
    b.points += config.drawPoints;
  } else if (match.scoreA > match.scoreB) {
    a.wins++;
    b.losses++;
    a.points += config.winPoints;
    b.points += config.lossPoints;
  } else {
    b.wins++;
    a.losses++;
    b.points += config.winPoints;
    a.points += config.lossPoints;
  }
}

function headToHeadPoints(
  teamIds: string[],
  matches: CompletedGroupMatch[],
  config: StandingsScoringConfig,
): Map<string, number> {
  const subset = new Set(teamIds);
  const h2h = new Map<string, number>();
  for (const id of teamIds) h2h.set(id, 0);

  for (const m of matches) {
    if (m.status !== "completed") continue;
    if (!subset.has(m.teamAId) || !subset.has(m.teamBId)) continue;
    if (m.scoreA === m.scoreB) {
      if (!config.allowDraw) continue;
      h2h.set(m.teamAId, (h2h.get(m.teamAId) ?? 0) + config.drawPoints);
      h2h.set(m.teamBId, (h2h.get(m.teamBId) ?? 0) + config.drawPoints);
    } else if (m.scoreA > m.scoreB) {
      h2h.set(m.teamAId, (h2h.get(m.teamAId) ?? 0) + config.winPoints);
      h2h.set(m.teamBId, (h2h.get(m.teamBId) ?? 0) + config.lossPoints);
    } else {
      h2h.set(m.teamBId, (h2h.get(m.teamBId) ?? 0) + config.winPoints);
      h2h.set(m.teamAId, (h2h.get(m.teamAId) ?? 0) + config.lossPoints);
    }
  }
  return h2h;
}

function compareByTieBreaker(
  a: StandingCore,
  b: StandingCore,
  key: TieBreakerKey,
  tiedIds: string[],
  matches: CompletedGroupMatch[],
  config: StandingsScoringConfig,
): number {
  switch (key) {
    case "points":
      return b.points - a.points;
    case "wins":
      return b.wins - a.wins;
    case "scoreDiff":
      return b.scoreDiff - a.scoreDiff;
    case "scoreFor":
      return b.scoreFor - a.scoreFor;
    case "matchesPlayed":
      return b.played - a.played;
    case "setWinPct":
      return setWinPct(b) - setWinPct(a);
    case "gameWinPct":
      return gameWinPct(b) - gameWinPct(a);
    case "headToHead": {
      // ITF: H2H only when exactly two teams remain tied.
      if (tiedIds.length !== 2) return 0;
      const h2h = headToHeadPoints(tiedIds, matches, config);
      return (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0);
    }
    case "manual":
      return 0;
    default:
      return 0;
  }
}

/**
 * ITF-aligned recursive partition sort:
 * Apply each key; when a tied subgroup shrinks to 2, H2H applies on later visits.
 */
function sortStandings(
  rows: StandingCore[],
  matches: CompletedGroupMatch[],
  config: StandingsScoringConfig,
): TeamStandingRow[] {
  const ranked = partitionSortWithConfig(rows, matches, config.tieBreakers, 0, config);

  const result: TeamStandingRow[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i]!;
    let needsManualResolution = false;
    if (i > 0) {
      const prev = ranked[i - 1]!;
      const allEqual = config.tieBreakers.every((key) => {
        if (key === "manual") return false;
        const tiedIds =
          key === "headToHead" ? [prev.teamId, row.teamId] : ([] as string[]);
        return compareByTieBreaker(prev, row, key, tiedIds, matches, config) === 0;
      });
      if (allEqual && config.tieBreakers.includes("manual")) {
        needsManualResolution = true;
      }
    }
    result.push({
      ...row,
      winRate: matchWinRatePercent(row.wins, row.played),
      rank: i + 1,
      qualificationStatus: "pending",
      needsManualResolution,
    });
  }
  return result;
}

function partitionSortWithConfig(
  rows: StandingCore[],
  matches: CompletedGroupMatch[],
  keys: TieBreakerKey[],
  keyIndex: number,
  config: StandingsScoringConfig,
): StandingCore[] {
  if (rows.length <= 1) return rows;
  if (keyIndex >= keys.length) {
    return [...rows].sort((a, b) => a.teamName.localeCompare(b.teamName));
  }

  const key = keys[keyIndex]!;
  if (key === "manual") {
    return [...rows].sort((a, b) => a.teamName.localeCompare(b.teamName));
  }

  // ITF: H2H only when exactly 2 remain tied at this stage.
  if (key === "headToHead") {
    if (rows.length === 2) {
      const h2h = compareByTieBreaker(
        rows[0]!,
        rows[1]!,
        "headToHead",
        [rows[0]!.teamId, rows[1]!.teamId],
        matches,
        config,
      );
      if (h2h !== 0) {
        return h2h < 0 ? [rows[0]!, rows[1]!] : [rows[1]!, rows[0]!];
      }
    }
    // 3+ or equal H2H → continue with set/game %
    return partitionSortWithConfig(rows, matches, keys, keyIndex + 1, config);
  }

  const ordered = [...rows].sort((a, b) => {
    const cmp = compareByTieBreaker(a, b, key, [], matches, config);
    if (cmp !== 0) return cmp;
    return a.teamName.localeCompare(b.teamName);
  });

  const out: StandingCore[] = [];
  let i = 0;
  while (i < ordered.length) {
    const group: StandingCore[] = [ordered[i]!];
    let j = i + 1;
    while (j < ordered.length) {
      if (compareByTieBreaker(ordered[i]!, ordered[j]!, key, [], matches, config) === 0) {
        group.push(ordered[j]!);
        j++;
      } else break;
    }
    if (group.length === 1) {
      out.push(group[0]!);
    } else {
      // After a % key shrinks a multi-way tie to 2, H2H applies on the next H2H key.
      out.push(...partitionSortWithConfig(group, matches, keys, keyIndex + 1, config));
    }
    i = j;
  }
  return out;
}

export function computeGroupStandings(
  teams: { id: string; name: string }[],
  matches: CompletedGroupMatch[],
  config: StandingsScoringConfig,
  teamsAdvance: number,
  options?: {
    lockQualification?: boolean;
  },
): TeamStandingRow[] {
  const map = new Map<string, StandingCore>();
  for (const t of teams) {
    map.set(t.id, initStanding(t.id, t.name));
  }
  for (const m of matches) {
    applyMatchResult(map, m, config);
  }
  const ranked = sortStandings([...map.values()], matches, config);
  const groupFixturesDone = allGroupMatchesCompleted(matches);
  const anyMatchPlayed = ranked.some((r) => r.played > 0);
  const lockQualification =
    (options?.lockQualification ?? true) && groupFixturesDone && anyMatchPlayed;

  return ranked.map((row) => ({
    ...row,
    qualificationStatus: !lockQualification
      ? ("pending" as const)
      : row.rank <= teamsAdvance
        ? ("qualified" as const)
        : ("eliminated" as const),
  }));
}

export function allGroupMatchesCompleted(
  matches: Array<{ status: string }>,
): boolean {
  if (!matches.length) return false;
  return matches.every((m) => m.status === "completed" || m.status === "bye");
}

export function computeCrossPoolBestRunnerUps(
  groups: { standings: TeamStandingRow[] }[],
  teamsAdvance: number,
  bestRunnerUpSlots: number,
  config: StandingsScoringConfig,
  matches: CompletedGroupMatch[] = [],
): TeamStandingRow[] {
  if (bestRunnerUpSlots <= 0 || teamsAdvance < 1) return [];

  const runnerUpRank = teamsAdvance + 1;
  const runners: StandingCore[] = [];
  for (const g of groups) {
    for (const row of g.standings) {
      if (row.rank === runnerUpRank) {
        runners.push({
          teamId: row.teamId,
          teamName: row.teamName,
          played: row.played,
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
          scoreFor: row.scoreFor,
          scoreAgainst: row.scoreAgainst,
          scoreDiff: row.scoreDiff,
          points: row.points,
          setsFor: row.setsFor,
          setsAgainst: row.setsAgainst,
          gamesFor: row.gamesFor,
          gamesAgainst: row.gamesAgainst,
        });
      }
    }
  }

  const ranked = sortStandings(runners, matches, config);
  return ranked.slice(0, bestRunnerUpSlots);
}

export function applyBestRunnerUpQualification(
  groups: { standings: TeamStandingRow[] }[],
  teamsAdvance: number,
  bestRunnerUpSlots: number,
  scoringConfig: StandingsScoringConfig,
  matches: CompletedGroupMatch[] = [],
): void {
  const best = computeCrossPoolBestRunnerUps(
    groups,
    teamsAdvance,
    bestRunnerUpSlots,
    scoringConfig,
    matches,
  );
  const bestIds = new Set(best.map((r) => r.teamId));
  for (const g of groups) {
    for (let i = 0; i < g.standings.length; i++) {
      const row = g.standings[i]!;
      if (bestIds.has(row.teamId) && row.qualificationStatus !== "qualified") {
        g.standings[i] = { ...row, qualificationStatus: "qualified" };
      }
    }
  }
}
