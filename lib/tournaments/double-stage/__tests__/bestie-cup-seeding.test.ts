import { describe, expect, it } from "vitest";
import {
  buildBestieCupRoundOneSlotOrder,
  type SeededTeam,
} from "@/lib/tournaments/double-stage/seeding";

function seeded(
  letter: string,
  teamId: string,
  rank = 1,
): SeededTeam {
  return {
    teamId,
    teamName: `Pool ${letter}`,
    groupId: `g-${letter}`,
    groupName: `Group ${letter}`,
    groupRank: rank,
    points: 1,
    wins: 2,
    scoreDiff: 2,
    scoreFor: 12,
    globalSeed: letter.charCodeAt(0) - 64,
  };
}

describe("buildBestieCupRoundOneSlotOrder", () => {
  it("pairs pool winners A–I, B–J, …, H–P in R16 order", () => {
    const letters = "ABCDEFGHIJKLMNOP".split("");
    const teams = letters.map((l) => seeded(l, `t-${l}`));
    const slots = buildBestieCupRoundOneSlotOrder(teams, 16);

    expect(slots[0]?.groupName).toBe("Group A");
    expect(slots[1]?.groupName).toBe("Group I");
    expect(slots[2]?.groupName).toBe("Group B");
    expect(slots[3]?.groupName).toBe("Group J");
    expect(slots[14]?.groupName).toBe("Group H");
    expect(slots[15]?.groupName).toBe("Group P");
  });
});
