import { describe, expect, it } from "vitest";
import { knockoutBracketEntryNeedsSeeding } from "@/lib/tournaments/double-stage/knockout-seeding-state";

describe("knockoutBracketEntryNeedsSeeding", () => {
  it("returns true when R1 slots exist but have no teams", () => {
    expect(
      knockoutBracketEntryNeedsSeeding([
        {
          roundNumber: 1,
          matchNumber: 1,
          teamAId: null,
          teamBId: null,
          metadata: { isSeriesSlot: true, legIndex: 1 },
        },
        {
          roundNumber: 1,
          matchNumber: 2,
          teamAId: null,
          teamBId: null,
          metadata: { isSeriesSlot: true, legIndex: 1 },
        },
        {
          roundNumber: 2,
          matchNumber: 1,
          teamAId: null,
          teamBId: null,
          metadata: { phase: "final", isSeriesSlot: true, legIndex: 1 },
        },
      ]),
    ).toBe(true);
  });

  it("returns false when R1 already has teams", () => {
    expect(
      knockoutBracketEntryNeedsSeeding([
        {
          roundNumber: 1,
          matchNumber: 1,
          teamAId: "t1",
          teamBId: "t2",
          metadata: { isSeriesSlot: true },
        },
      ]),
    ).toBe(false);
  });

  it("ignores series child legs when checking seeding", () => {
    expect(
      knockoutBracketEntryNeedsSeeding([
        {
          roundNumber: 1,
          matchNumber: 1,
          teamAId: "t1",
          teamBId: "t2",
          metadata: { isSeriesSlot: true, legIndex: 1 },
        },
        {
          roundNumber: 1,
          matchNumber: 1,
          teamAId: null,
          teamBId: null,
          metadata: { seriesParentId: "parent", legIndex: 2 },
        },
      ]),
    ).toBe(false);
  });
});
