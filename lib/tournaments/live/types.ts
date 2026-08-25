import type { TournamentLivePhase } from "@/lib/tournaments/core/types";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import type {
  IntraGamePointStyle,
  MatchGameState,
  MatchScoreMode,
} from "@/lib/tournaments/scoring/game-mode";
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
    type: "americano_round" | "lobby_round" | "bracket" | "group_stage";
    groupId?: string;
    roundNumber?: number;
    roundLabel?: string | null;
    matchNumber?: number;
    teamAName?: string | null;
    teamBName?: string | null;
    teamAId?: string | null;
    teamBId?: string | null;
    bracketMatchId?: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
    status?: string;
    startedAt?: string | null;
    endedAt?: string | null;
    courtId?: string | null;
    timerEndsAt?: string | null;
    teamAPlayers?: string[];
    teamBPlayers?: string[];
    playType?: string | null;
    playNumber?: number | null;
    durationSeconds?: number | null;
    scoreEvents?: MatchScoreEvent[];
    /** Intra-game rally points when matchScoreMode = "games". */
    gameState?: MatchGameState | null;
  }>;
  /** Scoring shape for venue display / public live boards. */
  scoring?: {
    matchScoreMode: MatchScoreMode;
    /** Race-to / Total target N (supports custom N from Official matchScoring). */
    raceToGames?: number;
    /** Official total vs race_to length (default race_to). */
    lengthMode?: "race_to" | "total";
    pointsToWinGame?: number;
    pointStyle?: IntraGamePointStyle;
    /**
     * Est. match length for LiveMatchTimer (same source as public Live Score).
     * Null when not applicable / unknown.
     */
    roundDurationMinutes?: number | null;
  };
  courts?: Array<{
    id: string;
    courtNumber: number;
    name: string;
    sortOrder: number;
    activeMatchId: string | null;
  }>;
  displayConfig?: {
    layout: string;
    courtIds?: string[];
    rotationIntervalSec?: number;
    autoRotate?: boolean;
    rotationLayouts?: string[];
    showUpcoming?: boolean;
    showHighlights?: boolean;
    brandTheme?: {
      primaryColor?: string;
      accentColor?: string;
      backgroundStyle?: "gradient" | "solid" | "dark_court";
      showPartnerLogo?: boolean;
      scoreboardStyle?: "classic" | "bold" | "minimal";
    };
    sponsorBanners?: Array<{
      id: string;
      imageUrl: string;
      storageKey: string;
      label?: string;
    }>;
  };
  matchHistory: Array<{
    id: string;
    label: string;
    summary: string | null;
    score: string;
    endedAt: string | null;
    playType?: string | null;
    roundNumber?: number;
    teamAId?: string | null;
    teamBId?: string | null;
    teamAName?: string | null;
    teamBName?: string | null;
    teamAPlayers?: string[];
    teamBPlayers?: string[];
    bracketMatchId?: string | null;
    scoreEvents?: MatchScoreEvent[];
  }>;
  leaderboard: unknown[];
  doubleStage?: {
    phase: "group" | "knockout";
    groups: unknown[];
    knockoutReady: boolean;
    allGroupMatchesCompleted: boolean;
    qualifiedCount: number;
  };
  playerStats: TournamentSessionStats;
  lastUpdatedAt: string;
};
