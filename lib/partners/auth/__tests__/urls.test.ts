import { describe, expect, it } from "vitest";
import { sanitizePartnerCallbackUrl } from "@/lib/partners/auth/urls";
import { partnerPlayerSessionCookieName } from "@/lib/partners/auth/constants";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/partners/auth/tokens";

describe("partner player auth helpers", () => {
  it("sanitizes callback URLs to same partner only", () => {
    expect(sanitizePartnerCallbackUrl("acme", "/acme/tournaments")).toBe(
      "/acme/tournaments",
    );
    expect(sanitizePartnerCallbackUrl("acme", "/acme")).toBe("/acme");
    expect(sanitizePartnerCallbackUrl("acme", "/dashboard/partner")).toBe("/acme");
    expect(sanitizePartnerCallbackUrl("acme", "/other/login")).toBe("/acme");
    expect(sanitizePartnerCallbackUrl("acme", "https://evil.com/phish")).toBe(
      "/acme",
    );
    expect(
      sanitizePartnerCallbackUrl("acme", "https://example.com/acme/account"),
    ).toBe("/acme/account");
  });

  it("rejects open-redirect tricks", () => {
    expect(sanitizePartnerCallbackUrl("acme", "//evil.com")).toBe("/acme");
    expect(sanitizePartnerCallbackUrl("acme", "/\\evil.com")).toBe("/acme");
    expect(sanitizePartnerCallbackUrl("acme", "/acme/../dashboard")).toBe("/acme");
    expect(sanitizePartnerCallbackUrl("acme", "/acme%2f..%2fdashboard")).toBe(
      "/acme",
    );
  });

  it("scopes session cookie names per partner slug", () => {
    expect(partnerPlayerSessionCookieName("Acme-Club")).toBe("gg_pps_acme-club");
    expect(partnerPlayerSessionCookieName("a/b")).toBe("gg_pps_ab");
  });

  it("hashes opaque tokens stably", () => {
    const token = generateOpaqueToken(16);
    expect(hashOpaqueToken(token)).toHaveLength(64);
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
    expect(hashOpaqueToken(token)).not.toBe(hashOpaqueToken(token + "x"));
  });
});
