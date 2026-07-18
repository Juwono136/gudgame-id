import type { StandingsScoringConfig, TieBreakerKey } from "@/lib/tournaments/scoring/config";

export type CompletedGroupMatch = {
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  status: string;
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
  rank: number;
  qualificationStatus: "pending" | "qualified" | "eliminated";
  needsManualResolution?: boolean;
};

function initStanding(teamId: string, teamName: string): Omit<TeamStandingRow, "rank" | "qualificationStatus"> {
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
  };
}

function applyMatchResult(
  standings: Map<string, Omit<TeamStandingRow, "rank" | "qualificationStatus">>,
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
      if (config.allowDraw) {
        h2h.set(m.teamAId, (h2h.get(m.teamAId) ?? 0) + config.drawPoints);
        h2h.set(m.teamBId, (h2h.get(m.teamBId) ?? 0) + config.drawPoints);
      }
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
  a: Omit<TeamStandingRow, "rank" | "qualificationStatus">,
  b: Omit<TeamStandingRow, "rank" | "qualificationStatus">,
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
    case "headToHead": {
      if (tiedIds.length < 2) return 0;
      const h2h = headToHeadPoints(tiedIds, matches, config);
      return (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0);
    }
    case "manual":
      return 0;
    default:
      return 0;
  }
}

function sortStandings(
  rows: Omit<TeamStandingRow, "rank" | "qualificationStatus">[],
  matches: CompletedGroupMatch[],
  config: StandingsScoringConfig,
): TeamStandingRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const key of config.tieBreakers) {
      if (key === "headToHead") {
        const tiedIds = sorted
          .filter(
            (r) =>
              r.points === a.points &&
              r.wins === a.wins &&
              r.scoreDiff === a.scoreDiff &&
              r.scoreFor === a.scoreFor,
          )
          .map((r) => r.teamId);
        const cmp = compareByTieBreaker(a, b, key, tiedIds, matches, config);
        if (cmp !== 0) return cmp;
      } else if (key !== "manual") {
        const cmp = compareByTieBreaker(a, b, key, [], matches, config);
        if (cmp !== 0) return cmp;
      }
    }
    return a.teamName.localeCompare(b.teamName);
  });

  const result: TeamStandingRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    let needsManualResolution = false;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const allEqual = config.tieBreakers.every((key) => {
        if (key === "manual") return false;
        if (key === "headToHead") {
          const tiedIds = [prev.teamId, row.teamId];
          return (
            compareByTieBreaker(prev, row, key, tiedIds, matches, config) === 0
          );
        }
        return compareByTieBreaker(prev, row, key, [], matches, config) === 0;
      });
      if (allEqual && config.tieBreakers.includes("manual")) {
        needsManualResolution = true;
      }
    }
    result.push({
      ...row,
      rank: i + 1,
      qualificationStatus: "pending",
      needsManualResolution,
    });
  }
  return result;
}

export function computeGroupStandings(
  teams: { id: string; name: string }[],
  matches: CompletedGroupMatch[],
  config: StandingsScoringConfig,
  teamsAdvance: number,
  options?: {
    /**
     * When false, keep all rows pending even if this group's fixtures are done
     * (e.g. other groups still playing — tournament-wide gate).
     */
    lockQualification?: boolean;
  },
): TeamStandingRow[] {
  const map = new Map<string, Omit<TeamStandingRow, "rank" | "qualificationStatus">>();
  for (const t of teams) {
    map.set(t.id, initStanding(t.id, t.name));
  }
  for (const m of matches) {
    applyMatchResult(map, m, config);
  }
  const ranked = sortStandings([...map.values()], matches, config);
  const groupFixturesDone = allGroupMatchesCompleted(matches);
  const anyMatchPlayed = ranked.some((r) => r.played > 0);
  // Never show Qualified/Eliminated before real play, or before fixtures finish.
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
  matches: { status: string }[],
): boolean {
  if (matches.length === 0) return false;
  return matches.every((m) => m.status === "completed");
}
