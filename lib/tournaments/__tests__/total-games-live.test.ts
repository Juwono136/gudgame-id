import { describe, expect, it } from "vitest";
import {
  formatGamesMatchLengthLabel,
  isRaceToGamesMatchComplete,
  isTotalGamesMatchComplete,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import { resolveMatchScoring } from "@/lib/tournaments/scoring/match-scoring";
import { composeDoubleStageMatchScoring } from "@/lib/tournaments/match-config";
import {
  getTournamentGameRules,
  getTournamentRaceToTarget,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stub(settings: Record<string, unknown>): TournamentDetail {
  return {
    id: "t1",
    name: "Total vs Race",
    slug: "total-vs-race",
    sportSlug: "padel",
    status: "live",
    tournamentType: "official",
    format: "double_stage",
    settings,
  } as TournamentDetail;
}

const baseRules = (partial: Partial<MatchGameRules>): MatchGameRules => ({
  raceToGames: 4,
  pointsToWinGame: 40,
  gameDecider: "golden_point",
  pointStyle: "simple",
  ...partial,
});

describe("Total-N live games completion (regression: not Race to N)", () => {
  it("Total 4 completes at 1–3 (4 games played) — Race to 4 does not", () => {
    const total = baseRules({ lengthMode: "total", raceToGames: 4 });
    const race = baseRules({ lengthMode: "race_to", raceToGames: 4 });

    expect(isRaceToGamesMatchComplete(1, 3, total)).toEqual({
      complete: true,
      winner: "b",
    });
    expect(isRaceToGamesMatchComplete(1, 3, race).complete).toBe(false);
    expect(isTotalGamesMatchComplete(1, 3, 4)).toEqual({
      complete: true,
      winner: "b",
    });
  });

  it("Total 4 stays incomplete at 1–2 (only 3 games played)", () => {
    const total = baseRules({ lengthMode: "total", raceToGames: 4 });
    expect(isRaceToGamesMatchComplete(1, 2, total).complete).toBe(false);
  });

  it("Total 4 tied 2–2 is complete (host finalize / draw policy)", () => {
    expect(isTotalGamesMatchComplete(2, 2, 4)).toEqual({
      complete: true,
      winner: null,
    });
  });

  it("labels show Total N not Race to N", () => {
    expect(
      formatGamesMatchLengthLabel(baseRules({ lengthMode: "total", raceToGames: 4 })),
    ).toBe("Total 4");
    expect(
      formatGamesMatchLengthLabel(baseRules({ lengthMode: "race_to", raceToGames: 4 })),
    ).toBe("Race to 4");
  });

  it("getTournamentGameRules wires lengthMode from matchScoring.total", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: composeDoubleStageMatchScoring(
        { mode: "total", totalSets: 4 },
        { mode: "race_to", raceTo: { value: 6 } },
      ),
    });
    const group = getTournamentGameRules(t, "group");
    const ko = getTournamentGameRules(t, "knockout");
    expect(group.lengthMode).toBe("total");
    expect(group.raceToGames).toBe(4);
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(isRaceToGamesMatchComplete(1, 3, group).complete).toBe(true);

    expect(ko.lengthMode).toBe("race_to");
    expect(ko.raceToGames).toBe(6);
    expect(isRaceToGamesMatchComplete(1, 3, ko).complete).toBe(false);
    expect(isRaceToGamesMatchComplete(6, 2, ko).complete).toBe(true);
  });

  it("resolveMatchScoring total supports flat live games won", () => {
    expect(
      resolveMatchScoring({
        config: { mode: "total", totalSets: 4 },
        sideA: { points: 1 },
        sideB: { points: 3 },
      }),
    ).toMatchObject({ status: "complete", winner: "b" });

    expect(
      resolveMatchScoring({
        config: { mode: "total", totalSets: 4 },
        sideA: { points: 1 },
        sideB: { points: 2 },
      }).status,
    ).toBe("incomplete");
  });
});
