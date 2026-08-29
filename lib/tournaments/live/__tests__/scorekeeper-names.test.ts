import { describe, expect, it } from "vitest";
import {
  formatScorekeeperDisplayName,
  scorekeeperLabelFromMap,
} from "@/lib/tournaments/live/scorekeeper-display";

describe("scorekeeper display names", () => {
  it("prefers full name over nickname for scorekeeper labels", () => {
    expect(
      formatScorekeeperDisplayName("Shafira Lafitri Kurniawan", "zakadx"),
    ).toBe("Shafira Lafitri Kurniawan");
    expect(formatScorekeeperDisplayName(null, "zakadx")).toBe("zakadx");
    expect(formatScorekeeperDisplayName("", "")).toBe("Scorekeeper");
  });

  it("resolves from map by user id", () => {
    const map = new Map([["u1", "Shafira Lafitri Kurniawan"]]);
    expect(scorekeeperLabelFromMap(map, "u1")).toBe("Shafira Lafitri Kurniawan");
    expect(scorekeeperLabelFromMap(map, "missing")).toBeNull();
  });
});
