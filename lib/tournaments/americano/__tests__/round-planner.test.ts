import { describe, expect, it } from "vitest";
import {
  buildAmericanoPartnerPairs,
  planAmericanoRound,
} from "@/lib/tournaments/americano/round-planner";

describe("americano round planner", () => {
  it("keeps size-2 squad mates as partners", () => {
    const players = [
      { id: "a1", name: "A1", squadId: "s1" },
      { id: "a2", name: "A2", squadId: "s1" },
      { id: "b1", name: "B1", squadId: "s2" },
      { id: "b2", name: "B2", squadId: "s2" },
      { id: "c1", name: "C1", squadId: "s3" },
      { id: "c2", name: "C2", squadId: "s3" },
      { id: "d1", name: "D1", squadId: "s4" },
      { id: "d2", name: "D2", squadId: "s4" },
    ];

    const { pairs } = buildAmericanoPartnerPairs(players, 7, 1);
    expect(pairs).toHaveLength(4);
    for (const [p1, p2] of pairs) {
      expect(p1.squadId).toBe(p2.squadId);
    }
  });

  it("fills courts with four distinct players", () => {
    const players = [
      { id: "a1", name: "A1", squadId: "s1" },
      { id: "a2", name: "A2", squadId: "s1" },
      { id: "b1", name: "B1", squadId: "s2" },
      { id: "b2", name: "B2", squadId: "s2" },
      { id: "c1", name: "C1", squadId: "s3" },
      { id: "c2", name: "C2", squadId: "s3" },
      { id: "d1", name: "D1", squadId: "s4" },
      { id: "d2", name: "D2", squadId: "s4" },
    ];

    const plan = planAmericanoRound({
      players,
      courtCount: 2,
      roundNumber: 1,
      seed: 11,
    });

    expect(plan.pairings).toHaveLength(2);
    for (const pairing of plan.pairings) {
      const ids = [
        pairing.teamA[0].id,
        pairing.teamA[1].id,
        pairing.teamB[0].id,
        pairing.teamB[1].id,
      ];
      expect(new Set(ids).size).toBe(4);
      expect(pairing.teamA[0].squadId).toBe(pairing.teamA[1].squadId);
      expect(pairing.teamB[0].squadId).toBe(pairing.teamB[1].squadId);
    }
  });

  it("still pairs singles across squads when needed", () => {
    const players = [
      { id: "a1", name: "A1", squadId: "s1" },
      { id: "b1", name: "B1", squadId: "s2" },
      { id: "c1", name: "C1", squadId: "s3" },
      { id: "d1", name: "D1", squadId: "s4" },
    ];

    const plan = planAmericanoRound({
      players,
      courtCount: 1,
      roundNumber: 1,
      seed: 3,
    });

    expect(plan.pairings).toHaveLength(1);
    const ids = [
      plan.pairings[0]!.teamA[0].id,
      plan.pairings[0]!.teamA[1].id,
      plan.pairings[0]!.teamB[0].id,
      plan.pairings[0]!.teamB[1].id,
    ];
    expect(new Set(ids).size).toBe(4);
  });
});
