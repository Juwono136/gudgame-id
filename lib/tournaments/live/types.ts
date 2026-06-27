import type { TournamentLivePhase } from "@/lib/tournaments/core/types";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";

export type TournamentLivePayload = {
  phase: TournamentLivePhase;
  message?: string;
  tournament: {
    id: string;
    name: string;
    slug: string;
    sportSlug: string;
    status: string;
    tournamentType: string;
    officialBilling: string | null;
    format: string;
    venue: string | null;
    categoryLabel: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  players: Array<{
    teamId: string;
    teamName: string;
    members: Array<{
      userId: string;
      name: string | null;
      image: string | null;
      role: string;
      slotIndex: number;
    }>;
  }>;
  bracket: {
    matches: unknown[];
    leaderboard: unknown[];
    generated: boolean;
  };
  matches: Array<{
    id: string;
    type: "americano_round" | "lobby_round" | "bracket";
    roundNumber?: number;
    matchNumber?: number;
    teamAName?: string | null;
    teamBName?: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
    status?: string;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
  matchHistory: Array<{
    id: string;
    label: string;
    summary: string | null;
    score: string;
    endedAt: string | null;
  }>;
  leaderboard: unknown[];
  playerStats: TournamentSessionStats;
  lastUpdatedAt: string;
};
