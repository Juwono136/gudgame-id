import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { dedupeReclubMatchViews } from "@/lib/tournaments/reclub/round-groups";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { liveMatchesToReclubViews } from "@/lib/tournaments/reclub/live-match-mappers";

/** Unified session match list for fun match public tabs (deduped). */
export function getFunMatchSessionViews(
  liveData: TournamentLivePayload | undefined,
): ReclubMatchView[] {
  if (!liveData?.matches?.length) return [];
  return dedupeReclubMatchViews(liveMatchesToReclubViews(liveData));
}

export function getFunMatchCompletedViews(
  liveData: TournamentLivePayload | undefined,
): ReclubMatchView[] {
  return getFunMatchSessionViews(liveData).filter((m) => m.status === "completed");
}
