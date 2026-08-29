import { describe, expect, it } from "vitest";
import {
  isPlausibleCourtLabel,
  resolveCourtLabel,
  resolveFeaturedCourtLabel,
} from "@/lib/tournaments/reclub/court-label";

describe("isPlausibleCourtLabel", () => {
  it("accepts normal court names", () => {
    expect(isPlausibleCourtLabel("Court 1")).toBe(true);
    expect(isPlausibleCourtLabel("Center Court")).toBe(true);
  });

  it("rejects tournament status lines", () => {
    expect(isPlausibleCourtLabel("Kita Test · Live")).toBe(false);
    expect(isPlausibleCourtLabel("Official live")).toBe(false);
    expect(isPlausibleCourtLabel("Fun Match live")).toBe(false);
    expect(isPlausibleCourtLabel("")).toBe(false);
  });
});

describe("resolveCourtLabel", () => {
  const courts = [
    { id: "c1", name: "Court 1", courtNumber: 1 },
    { id: "c2", name: "Court 2", courtNumber: 2 },
  ];

  it("resolves by id", () => {
    expect(resolveCourtLabel("c2", courts)).toBe("Court 2");
  });

  it("falls back to index", () => {
    expect(resolveCourtLabel(null, courts, 0)).toBe("Court 1");
    expect(resolveCourtLabel("missing", [], 2)).toBe("Court 3");
  });

  it("ignores implausible stored names", () => {
    expect(
      resolveCourtLabel("bad", [{ id: "bad", name: "Event · Live", courtNumber: 4 }], 0),
    ).toBe("Court 4");
  });
});

describe("resolveFeaturedCourtLabel", () => {
  const courts = [
    {
      id: "c1",
      name: "Court 1",
      courtNumber: 1,
      activeMatchId: "m1",
    },
    {
      id: "c2",
      name: "Court 2",
      courtNumber: 2,
      activeMatchId: null,
    },
  ];

  it("prefers match.courtId", () => {
    expect(
      resolveFeaturedCourtLabel({
        match: { id: "m9", courtId: "c2" },
        courts,
        activeMatches: [{ id: "m9", courtId: "c2" }],
      }),
    ).toBe("Court 2");
  });

  it("uses activeMatchId when courtId missing", () => {
    expect(
      resolveFeaturedCourtLabel({
        match: { id: "m1", courtId: null },
        courts,
        activeMatches: [{ id: "m1", courtId: null }],
      }),
    ).toBe("Court 1");
  });

  it("uses pinned label when plausible", () => {
    expect(
      resolveFeaturedCourtLabel({
        match: { id: "m1", courtId: "c1" },
        courts,
        activeMatches: [],
        pinnedLabel: "Center",
      }),
    ).toBe("Center");
  });

  it("rejects pinned tournament subtitle", () => {
    expect(
      resolveFeaturedCourtLabel({
        match: { id: "m1", courtId: "c1" },
        courts,
        activeMatches: [{ id: "m1", courtId: "c1" }],
        pinnedLabel: "Kita Test · Live",
      }),
    ).toBe("Court 1");
  });
});
