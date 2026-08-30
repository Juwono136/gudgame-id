import { describe, expect, it } from "vitest";
import { upcomingBestieCupFixtureWindow } from "@/lib/dev/bestie-cup-fixture-schedule";

describe("upcomingBestieCupFixtureWindow", () => {
  it("places start ~14 days after now and end 12h later", () => {
    const now = new Date("2026-08-30T10:15:30.000Z");
    const { startsAt, endsAt } = upcomingBestieCupFixtureWindow(now);

    expect(startsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(startsAt.getUTCMinutes()).toBe(0);
    expect(startsAt.getUTCSeconds()).toBe(0);
    expect(endsAt.getTime() - startsAt.getTime()).toBe(12 * 60 * 60 * 1000);

    const daysAhead =
      (startsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAhead).toBeGreaterThan(13);
    expect(daysAhead).toBeLessThan(15);
  });
});
