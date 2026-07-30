/**
 * Post-match social recap — shareable summary for partner hospitality.
 * Pure helpers (no server-only) so UI + API can reuse.
 */

export type MatchRecapInput = {
  partnerName: string;
  tournamentName: string;
  teamAName: string;
  teamBName: string;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA: number;
  scoreB: number;
  /** e.g. "6–4, 6–2" or set detail line */
  scoreDetail?: string | null;
  roundLabel?: string | null;
  completedAt?: string | null;
};

export type MatchRecapPayload = {
  headline: string;
  subline: string;
  shareText: string;
  scoreLine: string;
  playersA: string;
  playersB: string;
};

function formatPlayers(names: string[] | undefined, fallback: string): string {
  const cleaned = (names ?? []).map((n) => n.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(" / ") : fallback;
}

export function buildMatchRecap(input: MatchRecapInput): MatchRecapPayload {
  const winner =
    input.scoreA === input.scoreB
      ? null
      : input.scoreA > input.scoreB
        ? input.teamAName
        : input.teamBName;
  const scoreLine =
    input.scoreDetail?.trim() || `${input.scoreA}–${input.scoreB}`;
  const playersA = formatPlayers(input.teamAPlayers, input.teamAName);
  const playersB = formatPlayers(input.teamBPlayers, input.teamBName);
  const roundBit = input.roundLabel?.trim() ? ` · ${input.roundLabel.trim()}` : "";

  const headline = winner
    ? `${winner} wins ${scoreLine}`
    : `Draw ${scoreLine}`;
  const subline = `${input.tournamentName}${roundBit} · ${input.partnerName}`;

  const shareText = [
    `🏆 ${headline}`,
    `${playersA} vs ${playersB}`,
    subline,
    "",
    `Played at ${input.partnerName}`,
  ].join("\n");

  return { headline, subline, shareText, scoreLine, playersA, playersB };
}
