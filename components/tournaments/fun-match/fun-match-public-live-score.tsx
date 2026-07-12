"use client";

import { useMemo } from "react";
import { PublicMultiCourtLiveScore } from "@/components/tournaments/public/public-multi-court-live-score";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { TournamentDetail } from "@/lib/tournaments/service";

type FunMatchPublicLiveScoreProps = {
  tournament: TournamentDetail;
  liveData: TournamentLivePayload | undefined;
  teams: LobbyTeamView[];
};

export function FunMatchPublicLiveScore({
  tournament,
  liveData,
  teams,
}: FunMatchPublicLiveScoreProps) {
  return (
    <PublicMultiCourtLiveScore
      tournament={tournament}
      liveData={liveData}
      teams={teams}
      variant="fun_match"
      mode="rounds"
    />
  );
}
