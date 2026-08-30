import { describe, expect, it } from "vitest";
import {
  MATCH_SCHEDULE_SLIDE_SIZE,
  chunkSchedulePages,
  schedulePageCount,
} from "@/lib/tournaments/display/match-schedule-display";

describe("match schedule display helpers", () => {
  it("chunks fixtures by per-page capacity", () => {
    const items = Array.from({ length: 14 }, (_, i) => i);
    expect(chunkSchedulePages(items, 5)).toEqual([
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13],
    ]);
    expect(chunkSchedulePages(items, 3)[0]).toHaveLength(3);
  });

  it("counts pages for later queue", () => {
    expect(schedulePageCount(46, MATCH_SCHEDULE_SLIDE_SIZE)).toBe(
      Math.ceil(46 / MATCH_SCHEDULE_SLIDE_SIZE),
    );
    expect(schedulePageCount(0)).toBe(0);
  });
});
