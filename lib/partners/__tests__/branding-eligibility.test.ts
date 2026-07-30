import { describe, expect, it } from "vitest";
import { parsePartnerBranding } from "@/lib/partners/constants";
import { validatePartnerLogoFile } from "@/lib/partners/logo-validation";

describe("parsePartnerBranding", () => {
  it("keeps landing CMS fields", () => {
    const b = parsePartnerBranding({
      primaryColor: "#0d9488",
      tagline: "Play at PadelArea",
      about: "Community padel club",
      contactEmail: "hi@example.com",
    });
    expect(b.tagline).toBe("Play at PadelArea");
    expect(b.about).toBe("Community padel club");
    expect(b.contactEmail).toBe("hi@example.com");
  });

  it("drops empty strings", () => {
    expect(parsePartnerBranding({ tagline: "  " }).tagline).toBeUndefined();
  });
});

describe("validatePartnerLogoFile", () => {
  it("rejects oversized files", () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "x.png", {
      type: "image/png",
    });
    const result = validatePartnerLogoFile(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/5 MB/i);
  });

  it("rejects invalid mime", () => {
    const f = new File([new Uint8Array(10)], "x.bmp", { type: "image/bmp" });
    const result = validatePartnerLogoFile(f);
    expect(result.ok).toBe(false);
  });

  it("accepts jpeg under 5MB", () => {
    const f = new File([new Uint8Array(100)], "logo.jpg", { type: "image/jpeg" });
    expect(validatePartnerLogoFile(f).ok).toBe(true);
  });
});
