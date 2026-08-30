import { describe, expect, it } from "vitest";
import {
  computeBracketFitScale,
  fitCountAlongAxis,
  fitGroupStagePoolsPerSlide,
  fitLeaderboardRowsPerPage,
  fitMatchScheduleColumnPerPage,
  fitMatchScheduleStripPerPage,
  fitMultiCourtPerSlide,
} from "@/lib/tournaments/display/fit-capacity";
import {
  chunkSchedulePages,
  schedulePageCount,
} from "@/lib/tournaments/display/match-schedule-display";

describe("fit-capacity", () => {
  it("fits more cards on taller monitors", () => {
    expect(fitMatchScheduleColumnPerPage(280)).toBeLessThan(
      fitMatchScheduleColumnPerPage(720),
    );
    expect(fitMatchScheduleColumnPerPage(720)).toBeGreaterThanOrEqual(5);
    expect(fitMatchScheduleColumnPerPage(120)).toBe(1);
  });

  it("fits more done-strip cards on wider monitors", () => {
    expect(fitMatchScheduleStripPerPage(400)).toBeLessThan(
      fitMatchScheduleStripPerPage(1200),
    );
  });

  it("scales group-stage pools by viewport", () => {
    expect(fitGroupStagePoolsPerSlide(500, 400)).toBe(1);
    expect(fitGroupStagePoolsPerSlide(900, 500)).toBe(2);
    expect(fitGroupStagePoolsPerSlide(1400, 800)).toBe(4);
  });

  it("scales multi-court cards by viewport", () => {
    expect(fitMultiCourtPerSlide(600, 400)).toBe(1);
    expect(fitMultiCourtPerSlide(900, 500)).toBe(2);
    expect(fitMultiCourtPerSlide(1500, 800)).toBe(6);
  });

  it("fits leaderboard rows from container height", () => {
    expect(fitLeaderboardRowsPerPage(400)).toBeGreaterThanOrEqual(6);
    expect(fitLeaderboardRowsPerPage(900)).toBeGreaterThan(
      fitLeaderboardRowsPerPage(400),
    );
  });

  it("clamps axis fit between min and max", () => {
    expect(fitCountAlongAxis(10_000, 50, 8, 1, 5)).toBe(5);
    expect(fitCountAlongAxis(10, 50, 8, 2, 8)).toBe(2);
  });

  it("scales bracket trees to fit the TV viewport without cropping", () => {
    const down = computeBracketFitScale(1920, 900, 2400, 1600);
    expect(down).toBeLessThan(1);
    expect(down).toBeGreaterThan(0.2);
    expect(computeBracketFitScale(1920, 1000, 800, 500)).toBe(1.2);
    expect(computeBracketFitScale(400, 300, 2000, 1800)).toBeGreaterThanOrEqual(0.22);
  });
});

describe("chunkSchedulePages with dynamic perPage", () => {
  it("chunks by measured capacity", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    expect(chunkSchedulePages(items, 3)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [9],
    ]);
    expect(schedulePageCount(10, 3)).toBe(4);
  });
});
