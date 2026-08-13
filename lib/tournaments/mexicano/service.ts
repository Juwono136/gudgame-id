import "server-only";

import { getTournamentCourtCount, getTournamentMexicanoSettings } from "@/lib/tournaments/settings";
import {
  buildMexicanoLeaderboard,
  planMexicanoRound,
  type MexicanoPlayer,
  type MexicanoRoundPlan,
} from "@/lib/tournaments/mexicano/round-planner";
import type { TournamentDetail } from "@/lib/tournaments/service";

export async function planNextMexicanoRoundForTournament(
  tournament: TournamentDetail,
  players: MexicanoPlayer[],
  roundNumber: number,
): Promise<MexicanoRoundPlan> {
  const settings = getTournamentMexicanoSettings(tournament) ?? {
    mode: "team" as const,
    roundCount: 5,
  };
  return planMexicanoRound({
    players,
    roundNumber,
    mode: settings.mode,
    courtCount: getTournamentCourtCount(tournament),
  });
}

export { buildMexicanoLeaderboard, planMexicanoRound };
export type { MexicanoPlayer, MexicanoRoundPlan };
