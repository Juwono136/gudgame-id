"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { TournamentCourtView } from "@/hooks/use-tournament-courts";
import { isManageScoringWriteInFlight } from "@/hooks/use-double-stage-group-score";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";

import type { DoubleStageOverview } from "@/lib/tournaments/double-stage/service";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import { resolveManageScoringRefetchIntervalMs } from "@/lib/tournaments/live/poll-intervals";

export type ManageScoringPayload = {
  mode: "rounds" | "bracket" | "groups";
  courts: TournamentCourtView[];
  teams: LobbyTeamView[];
  reclubMatches: ReclubMatchView[];
  activeReclubMatches: ReclubMatchView[];
  bracketMatches: BracketMatchView[];
  activeBracketMatches: BracketMatchView[];
  groupMatches?: GroupMatchView[];
  activeGroupMatches?: GroupMatchView[];
  doubleStage?: DoubleStageOverview | null;
  summary: TournamentRegistrationSummary;
  tournament: {
    id: string;
    name: string;
    status: string;
    format: string;
    tournamentType: string;
    playersPerTeam: number;
    maxTeams: number | null;
  };
  teamsInActiveBracket?: string[];
  bracketEligibleTeamIds?: string[];
  sessionStats?: TournamentSessionStats;
};

function manageScoringKey(sportSlug: string, slug: string) {
  return ["tournaments", "manage-scoring", sportSlug, slug] as const;
}

export function useTournamentManageScoring(
  sportSlug: string,
  slug: string,
  enabled = true,
) {
  return useQuery({
    queryKey: manageScoringKey(sportSlug, slug),
    enabled: Boolean(sportSlug && slug) && enabled,
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/manage/scoring`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: ManageScoringPayload;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load scoring workspace"));
      }
      return json.data;
    },
    refetchInterval: (query) => {
      // Pause polling while a +/- write is in flight so stale GETs cannot clobber scores.
      if (isManageScoringWriteInFlight(sportSlug, slug)) return false;
      const data = query.state.data;
      if (!data) return false;
      return resolveManageScoringRefetchIntervalMs({
        hasActiveReclub: data.activeReclubMatches.length > 0,
        hasActiveBracket: data.activeBracketMatches.length > 0,
        hasActiveGroup: (data.activeGroupMatches?.length ?? 0) > 0,
      });
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function invalidateManageScoringKey(sportSlug: string, slug: string) {
  return manageScoringKey(sportSlug, slug);
}
