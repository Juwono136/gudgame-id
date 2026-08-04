import { describe, expect, it } from "vitest";
import {
  partnerBrandMediaKey,
  resolveStorageKey,
} from "@/lib/storage/media-url";

describe("partnerBrandMediaKey", () => {
  it("builds a stable logo key", () => {
    expect(partnerBrandMediaKey("abc", "logo", "png")).toBe(
      "partners/abc/logo/brand.png",
    );
  });

  it("builds a stable icon key", () => {
    expect(partnerBrandMediaKey("abc", "icon", "webp")).toBe(
      "partners/abc/icon/brand.webp",
    );
  });
});

describe("resolveStorageKey", () => {
  it("strips cache-bust query from media proxy urls", () => {
    expect(
      resolveStorageKey("/api/media/partners/abc/logo/brand.png?v=1712345678"),
    ).toBe("partners/abc/logo/brand.png");
  });

  it("accepts bare partner keys", () => {
    expect(resolveStorageKey("partners/abc/icon/brand.jpg")).toBe(
      "partners/abc/icon/brand.jpg",
    );
  });
});
