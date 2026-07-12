export type TeamRef = { id: string; name: string };

export type GroupFixturePair = {
  teamA: TeamRef;
  teamB: TeamRef;
};

/** Round-robin: every team plays every other team once. */
export function generateRoundRobinFixtures(teams: TeamRef[]): GroupFixturePair[] {
  const fixtures: GroupFixturePair[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({
        teamA: teams[i]!,
        teamB: teams[j]!,
      });
    }
  }
  return fixtures;
}

export function fixtureCountForGroupSize(teamCount: number): number {
  if (teamCount < 2) return 0;
  return (teamCount * (teamCount - 1)) / 2;
}
