import { describe, expect, it } from "vitest";
import {
  buildBracketMatchAnchors,
  buildLayoutBracketPaths,
  buildRoundedForkPaths,
  getBracketGridMetrics,
  getBracketMaxPlayersPerSide,
  getMainDrawGridSlots,
  getMatchCenterY,
  getMatchGridRow,
  getPlayInMatches,
} from "@/lib/tournaments/brackets/tree-layout";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";

describe("bracket tree layout", () => {
  const draw32 = Array.from({ length: 16 }, (_, i) => ({
    id: `r1-m${i + 1}`,
    roundNumber: 1,
    matchNumber: i + 1,
    nextMatchId: `r2-m${Math.floor(i / 2) + 1}`,
  })).concat(
    Array.from({ length: 8 }, (_, i) => ({
      id: `r2-m${i + 1}`,
      roundNumber: 2,
      matchNumber: i + 1,
      nextMatchId: `r3-m${Math.floor(i / 2) + 1}`,
    })),
  );

  it("sizes grid from round-of-32 match count", () => {
    expect(getMainDrawGridSlots(draw32)).toBe(16);
  });

  it("places later rounds by matchNumber", () => {
    expect(getMatchGridRow(2, 3)).toEqual({ rowStart: 5, span: 2 });
    expect(getMatchGridRow(1, 1)).toEqual({ rowStart: 1, span: 1 });
  });

  it("keeps play-in out of the main tree helpers", () => {
    const withPlayIn = [
      { id: "pi1", roundNumber: 0, matchNumber: 1, nextMatchId: "r1-m2" },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `r1-m${i + 1}`,
        roundNumber: 1,
        matchNumber: i + 1,
        nextMatchId: null as string | null,
      })),
    ];
    expect(getPlayInMatches(withPlayIn)).toHaveLength(1);
    expect(getMainDrawGridSlots(withPlayIn)).toBe(8);
  });

  it("builds connector paths aligned to target centers", () => {
    const metrics = getBracketGridMetrics(4);
    const matches = [
      { id: "a", roundNumber: 1, matchNumber: 1, nextMatchId: "c" },
      { id: "b", roundNumber: 1, matchNumber: 2, nextMatchId: "c" },
      { id: "c", roundNumber: 2, matchNumber: 1, nextMatchId: null },
    ];
    const anchors = buildBracketMatchAnchors(matches, [1, 2], metrics);
    const paths = buildLayoutBracketPaths(anchors);
    const target = anchors.find((a) => a.id === "c")!;
    const feederA = anchors.find((a) => a.id === "a")!;
    const feederB = anchors.find((a) => a.id === "b")!;
    expect(target.centerY).toBeCloseTo((feederA.centerY + feederB.centerY) / 2, 5);
    expect(paths.length).toBeGreaterThan(0);
  });

  it("builds rounded fork paths", () => {
    const paths = buildRoundedForkPaths(
      [
        { x: 0, y: 10 },
        { x: 0, y: 90 },
      ],
      { x: 100, y: 50 },
    );
    expect(paths.some((p) => p.includes("Q"))).toBe(true);
    expect(paths.at(-1)).toContain("H 100");
  });

  it("sizes row height for multi-player rosters", () => {
    const tight = getBracketGridMetrics(2, 2);
    const wide = getBracketGridMetrics(2, 4);
    expect(wide.rowHeight).toBeGreaterThan(tight.rowHeight);
    expect(wide.maxPlayersPerSide).toBe(4);
  });

  it("detects max players per side from matches", () => {
    expect(
      getBracketMaxPlayersPerSide([
        { teamAPlayers: ["a", "b"], teamBPlayers: ["c"] },
        { teamAPlayers: ["a", "b", "c", "d"], teamBPlayers: ["e", "f"] },
      ]),
    ).toEqual({ display: 4, needsOverflowRow: false });
    expect(
      getBracketMaxPlayersPerSide([
        {
          teamAPlayers: ["a", "b", "c", "d", "e", "f", "g"],
          teamBPlayers: ["h"],
        },
      ]),
    ).toEqual({ display: 6, needsOverflowRow: true });
  });

  it("reserves overflow row height when needed", () => {
    const base = getBracketGridMetrics(2, 6);
    const withOverflow = getBracketGridMetrics(2, 6, { overflowRow: true });
    expect(withOverflow.rowHeight).toBeGreaterThan(base.rowHeight);
  });
});

describe("bracket round labels", () => {
  it("labels play-in and Ro32 correctly", () => {
    expect(getBracketRoundLabel(0, 5)).toBe("Play-in");
    expect(getBracketRoundLabel(1, 5)).toBe("Round of 32");
    expect(getBracketRoundLabel(5, 5)).toBe("Final");
  });
});
