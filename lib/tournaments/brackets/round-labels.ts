export function getBracketRoundLabel(roundNumber: number, totalRounds: number): string {
  if (roundNumber <= 0) return "Play-in";
  const fromFinal = totalRounds - roundNumber + 1;
  if (fromFinal === 1) return "Final";
  if (fromFinal === 2) return "Semifinal";
  if (fromFinal === 3) return "Quarterfinal";
  if (fromFinal === 4) return "Round of 16";
  if (fromFinal === 5) return "Round of 32";
  if (fromFinal === 6) return "Round of 64";
  return `Round ${roundNumber}`;
}

/** Distance from the final: 1 = Final, 2 = SF, … */
export function bracketFromFinal(roundNumber: number, totalRounds: number): number {
  if (roundNumber <= 0 || totalRounds <= 0) return 0;
  return totalRounds - roundNumber + 1;
}

export function getTotalBracketRounds(matchCount: number): number {
  if (matchCount <= 0) return 0;
  let rounds = 0;
  let remaining = matchCount;
  while (remaining > 0) {
    rounds += 1;
    remaining = Math.floor(remaining / 2);
  }
  return rounds;
}

/** Expected KO rounds for a field size (32 → 5 rounds: R32…Final). */
export function expectedKnockoutRoundsForTeamCount(teamCount: number): number {
  if (teamCount < 2) return 1;
  return Math.ceil(Math.log2(teamCount));
}
