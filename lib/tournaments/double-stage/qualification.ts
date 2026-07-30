import type { StandingsScoringConfig } from "@/lib/tournaments/scoring/config";
import { computeCrossPoolBestRunnerUps } from "@/lib/tournaments/double-stage/standings";
import type { QualifiedTeam } from "@/lib/tournaments/double-stage/seeding";

export type BuildQualifiedOptions = {
  teamsAdvancePerGroup?: number;
  /** Extra KO slots filled by best runners-up across pools (from DoubleStageSettings). */
  bestRunnerUpSlots?: number;
  scoringConfig?: StandingsScoringConfig;
};

type StandingLike = {
  teamId: string;
  teamName: string;
  rank: number;
  points: number;
  wins: number;
  scoreDiff: number;
  scoreFor: number;
  qualificationStatus: string;
  played?: number;
  scoreAgainst?: number;
  losses?: number;
  draws?: number;
  setsFor?: number;
  setsAgainst?: number;
  gamesFor?: number;
  gamesAgainst?: number;
};

function toQualifiedTeam(
  g: { id: string; name: string },
  row: StandingLike,
): QualifiedTeam {
  return {
    teamId: row.teamId,
    teamName: row.teamName,
    groupId: g.id,
    groupName: g.name,
    groupRank: row.rank,
    points: row.points,
    wins: row.wins,
    scoreDiff: row.scoreDiff,
    scoreFor: row.scoreFor,
  };
}

/**
 * Collect knockout-eligible teams from group standings.
 * Prefer `qualificationStatus === "qualified"`; when options include
 * `bestRunnerUpSlots`, also ensure cross-pool best runners-up are included.
 */
export function buildQualifiedTeamsFromStandings(
  groups: {
    id: string;
    name: string;
    standings: StandingLike[];
  }[],
  options?: BuildQualifiedOptions,
): QualifiedTeam[] {
  const byId = new Map<string, QualifiedTeam>();

  for (const g of groups) {
    for (const row of g.standings) {
      const topN =
        options?.teamsAdvancePerGroup != null &&
        row.rank <= options.teamsAdvancePerGroup;
      if (row.qualificationStatus === "qualified" || topN) {
        byId.set(row.teamId, toQualifiedTeam(g, row));
      }
    }
  }

  const slots = options?.bestRunnerUpSlots ?? 0;
  const teamsAdvance = options?.teamsAdvancePerGroup;
  const scoringConfig = options?.scoringConfig;
  if (slots > 0 && teamsAdvance != null && scoringConfig) {
    const best = computeCrossPoolBestRunnerUps(
      groups.map((g) => ({
        standings: g.standings.map((row) => ({
          teamId: row.teamId,
          teamName: row.teamName,
          played: row.played ?? 0,
          wins: row.wins,
          losses: row.losses ?? 0,
          draws: row.draws ?? 0,
          scoreFor: row.scoreFor,
          scoreAgainst: row.scoreAgainst ?? 0,
          scoreDiff: row.scoreDiff,
          points: row.points,
          setsFor: row.setsFor ?? row.scoreFor ?? 0,
          setsAgainst: row.setsAgainst ?? row.scoreAgainst ?? 0,
          gamesFor: row.gamesFor ?? row.scoreFor ?? 0,
          gamesAgainst: row.gamesAgainst ?? row.scoreAgainst ?? 0,
          rank: row.rank,
          qualificationStatus: row.qualificationStatus as
            | "pending"
            | "qualified"
            | "eliminated",
        })),
      })),
      teamsAdvance,
      slots,
      scoringConfig,
    );
    for (const row of best) {
      if (byId.has(row.teamId)) continue;
      const g = groups.find((gr) => gr.standings.some((s) => s.teamId === row.teamId));
      if (g) byId.set(row.teamId, toQualifiedTeam(g, row));
    }
  }

  return [...byId.values()];
}
