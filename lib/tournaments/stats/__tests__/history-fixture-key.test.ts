import { describe, expect, it } from "vitest";
import {
  buildPlayerMatchRoundKey,
  playerMatchRoundContainsFixture,
  PLAYER_MATCH_FIXTURE_MARKER,
} from "@/lib/tournaments/stats/history-fixture-key";
import { rankingDeltaForMatch } from "@/lib/account/player-performance/points";

describe("player match history fixture keys", () => {
  it("embeds fixture id so legs / meetings stay unique under 80 chars", () => {
    const a = buildPlayerMatchRoundKey("Quarterfinal", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    const b = buildPlayerMatchRoundKey("Quarterfinal", "ffffffff-1111-2222-3333-444444444444");
    expect(a).not.toEqual(b);
    expect(a).toContain(PLAYER_MATCH_FIXTURE_MARKER);
    expect(a.length).toBeLessThanOrEqual(80);
    expect(playerMatchRoundContainsFixture(a, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      true,
    );
    expect(playerMatchRoundContainsFixture(b, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      false,
    );
  });

  it("keeps display label when fixture id is missing", () => {
    expect(buildPlayerMatchRoundKey("Group stage: A", "")).toBe("Group stage: A");
  });

  it("truncates long labels but preserves fixture id", () => {
    const long = "X".repeat(100);
    const id = "abc-123";
    const key = buildPlayerMatchRoundKey(long, id);
    expect(key.length).toBe(80);
    expect(key.endsWith(`${PLAYER_MATCH_FIXTURE_MARKER}${id}`)).toBe(true);
  });
});

describe("career points aligned with tournament ranking rules", () => {
  it("awards skill-tier points for Official paid and free the same way", () => {
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_paid",
        skillTier: "gold",
        resultType: "win",
      }),
    ).toBe(5);
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_free",
        skillTier: "gold",
        resultType: "win",
      }),
    ).toBe(5);
  });

  it("keeps No Rank and Fun Match at 0 career points", () => {
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_paid",
        skillTier: "open",
        resultType: "win",
      }),
    ).toBe(0);
    expect(
      rankingDeltaForMatch({
        isOfficial: false,
        statsTier: "fun_match",
        skillTier: "gold",
        resultType: "win",
      }),
    ).toBe(0);
  });
});
