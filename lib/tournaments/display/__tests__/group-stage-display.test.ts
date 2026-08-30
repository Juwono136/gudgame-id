import { describe, expect, it } from "vitest";
import {
  GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE,
  chunkGroupsForDisplay,
} from "@/lib/tournaments/display/group-stage-display";

describe("chunkGroupsForDisplay", () => {
  it("splits groups into slides of four", () => {
    const groups = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const slides = chunkGroupsForDisplay(groups);
    expect(slides).toHaveLength(3);
    expect(slides[0]).toHaveLength(GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE);
    expect(slides[1]).toHaveLength(GROUP_STAGE_DISPLAY_GROUPS_PER_SLIDE);
    expect(slides[2]).toHaveLength(2);
  });

  it("returns empty array for no groups", () => {
    expect(chunkGroupsForDisplay([])).toEqual([]);
  });
});
