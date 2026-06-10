export function getBracketRoundLabel(roundNumber: number, totalRounds: number): string {
  const fromFinal = totalRounds - roundNumber + 1;
  if (fromFinal === 1) return "Final";
  if (fromFinal === 2) return "Semifinal";
  if (fromFinal === 3) return "Quarterfinal";
  if (fromFinal === 4) return "Round of 16";
  if (fromFinal === 5) return "Round of 32";
  return `Round ${roundNumber}`;
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
