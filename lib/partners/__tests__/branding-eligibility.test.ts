import { describe, expect, it } from "vitest";
import { parsePartnerBranding } from "@/lib/partners/constants";
import { validatePartnerIconFile } from "@/lib/partners/icon-validation";
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
    expect(b.about).toContain("Community padel club");
    expect(b.contactEmail).toBe("hi@example.com");
  });

  it("sanitizes rich about html", () => {
    const b = parsePartnerBranding({
      about: '<p>Hello <script>alert(1)</script><strong>club</strong></p>',
    });
    expect(b.about).toContain("<strong>club</strong>");
    expect(b.about).not.toContain("script");
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

describe("validatePartnerIconFile", () => {
  it("rejects files over 2 MB", () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "icon.png", {
      type: "image/png",
    });
    const result = validatePartnerIconFile(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/2 MB/i);
  });

  it("rejects invalid mime", () => {
    const f = new File([new Uint8Array(10)], "x.ico", { type: "image/x-icon" });
    expect(validatePartnerIconFile(f).ok).toBe(false);
  });

  it("accepts png under 2 MB", () => {
    const f = new File([new Uint8Array(100)], "icon.png", { type: "image/png" });
    expect(validatePartnerIconFile(f).ok).toBe(true);
  });
});
