import { describe, expect, it } from "vitest";
import {
  buildFeederSlotPatch,
  nextMatchSlotForFeeder,
  winnerAlreadyInFeederSlot,
} from "@/lib/tournaments/brackets/feeder-slot";

describe("nextMatchSlotForFeeder", () => {
  it("maps odd matchNumbers to top slot (A)", () => {
    expect(nextMatchSlotForFeeder(1)).toBe("a");
    expect(nextMatchSlotForFeeder(3)).toBe("a");
    expect(nextMatchSlotForFeeder(5)).toBe("a");
  });

  it("maps even matchNumbers to bottom slot (B)", () => {
    expect(nextMatchSlotForFeeder(2)).toBe("b");
    expect(nextMatchSlotForFeeder(4)).toBe("b");
    expect(nextMatchSlotForFeeder(6)).toBe("b");
  });

  it("falls back to A for invalid match numbers", () => {
    expect(nextMatchSlotForFeeder(0)).toBe("a");
    expect(nextMatchSlotForFeeder(-1)).toBe("a");
  });
});

describe("buildFeederSlotPatch", () => {
  it("places lower-bracket feeder into team B and clears a misplaced A", () => {
    const patch = buildFeederSlotPatch(
      "b",
      { teamAId: "stellar", teamBId: "rr" },
      "stellar",
      "Stellar 3",
    );
    expect(patch).toEqual({
      teamBId: "stellar",
      teamBName: "Stellar 3",
      teamAId: null,
      teamAName: null,
    });
  });

  it("places upper-bracket feeder into team A without clearing the opponent", () => {
    const patch = buildFeederSlotPatch(
      "a",
      { teamAId: null, teamBId: "rr" },
      "win",
      "Winning Squad",
    );
    expect(patch).toEqual({
      teamAId: "win",
      teamAName: "Winning Squad",
    });
  });
});

describe("winnerAlreadyInFeederSlot", () => {
  it("detects correct placement", () => {
    expect(
      winnerAlreadyInFeederSlot("b", { teamAId: "rr", teamBId: "stellar" }, "stellar"),
    ).toBe(true);
    expect(
      winnerAlreadyInFeederSlot("a", { teamAId: "rr", teamBId: "stellar" }, "stellar"),
    ).toBe(false);
  });
});
