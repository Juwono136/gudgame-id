import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

export function isBracketMatchScored(status: BracketMatchView["status"]): boolean {
  return status === "in_progress" || status === "completed";
}

export function countScoredBracketMatches(
  matches: Pick<BracketMatchView, "status">[],
): number {
  return matches.filter((m) => isBracketMatchScored(m.status)).length;
}

export function countEditableRoundOneSlots(
  matches: Pick<BracketMatchView, "roundNumber" | "status" | "teamAId" | "teamBId">[],
): number {
  let slots = 0;
  for (const m of matches) {
    if (m.roundNumber !== 1 || m.status !== "pending") continue;
    if (!m.teamAId) slots += 1;
    if (!m.teamBId) slots += 1;
  }
  return slots;
}

/** Seeding stays editable until any bracket match is scored or the event ends. */
export function isBracketSeedingLocked(
  matches: Pick<BracketMatchView, "status">[],
  tournamentStatus: string,
  options?: { format?: string },
): boolean {
  if (tournamentStatus === "completed") return true;
  if (countScoredBracketMatches(matches) > 0) return true;
  // Double-stage walkovers already advanced a winner — don't reshuffle around them.
  if (options?.format === "double_stage") {
    return matches.some((m) => m.status === "bye");
  }
  return false;
}

export type BracketSeedingUiState = {
  locked: boolean;
  scoredMatchCount: number;
  editableRoundOneSlots: number;
  title: string;
  description: string;
};

export function getBracketSeedingUiState(
  matches: BracketMatchView[],
  tournamentStatus: string,
  options?: { format?: string },
): BracketSeedingUiState {
  const locked = isBracketSeedingLocked(matches, tournamentStatus, options);
  const scoredMatchCount = countScoredBracketMatches(matches);
  const editableRoundOneSlots = countEditableRoundOneSlots(matches);
  const isDoubleStage = options?.format === "double_stage";

  if (tournamentStatus === "completed") {
    return {
      locked: true,
      scoredMatchCount,
      editableRoundOneSlots,
      title: "Tournament completed",
      description:
        "This bracket is final. Seeding and team placement can no longer be changed.",
    };
  }

  if (locked) {
    return {
      locked: true,
      scoredMatchCount,
      editableRoundOneSlots,
      title: isDoubleStage
        ? "Knockout pairings locked"
        : "Seeding locked — matches already scored",
      description: isDoubleStage
        ? "A knockout match is live, finished, or already walked over. Pairings cannot be changed — score remaining matches in Live scoring. Reset is only available before any knockout result."
        : scoredMatchCount === 1
          ? "1 bracket match has been scored or is live. Round-one slots cannot be changed anymore — use Live scoring for the remaining matches."
          : `${scoredMatchCount} bracket matches have been scored or are live. Round-one slots cannot be changed anymore — use Live scoring for the remaining matches.`,
    };
  }

  if (isDoubleStage) {
    return {
      locked: false,
      scoredMatchCount,
      editableRoundOneSlots,
      title: "Qualified teams placed — you can still swap pairings",
      description:
        "Knockout is generated from group standings, not a random draw. Click a round-one slot to swap two qualified teams. Pairings lock once any knockout match starts. To rebuild the whole draw, use Reset bracket.",
    };
  }

  return {
    locked: false,
    scoredMatchCount,
    editableRoundOneSlots,
    title: "Seeding open — you can edit round one",
    description:
      editableRoundOneSlots > 0
        ? `Click any round-one slot labeled “Drop squad here” in the tree below, pick a team, then use Random seed or Save bracket when ready. ${editableRoundOneSlots} empty slot${editableRoundOneSlots === 1 ? "" : "s"} available.`
        : "All round-one slots are filled. Click a slot to replace a team, use Random seed to reshuffle, or Save bracket when ready.",
  };
}

export function canResetBracketTree(
  matches: Pick<BracketMatchView, "status">[],
  tournamentStatus: string,
): boolean {
  if (tournamentStatus === "completed") return false;
  return !matches.some((m) => isBracketMatchScored(m.status));
}

export function canEditRoundOneBracketSlot(
  match: Pick<BracketMatchView, "roundNumber" | "status">,
): boolean {
  return match.roundNumber === 1 && match.status === "pending";
}
