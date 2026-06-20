import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import type { GearProductValues } from "@/lib/wiki/gear-form";
import { normalizeScrapedGearAttributes } from "@/lib/wiki/gear/mapper";
import { getGearSpecsFields } from "@/lib/wiki/gear/spec-fields";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";

export function scrapePreviewToGearProduct(preview: WikiScrapePreview): GearProductValues {
  const attrs = normalizeScrapedGearAttributes(preview);
  const priceIdr =
    attrs.priceIdr != null && typeof attrs.priceIdr === "number"
      ? String(attrs.priceIdr)
      : "";
  return {
    displayName: preview.displayName,
    slug: "",
    summary: preview.summary ?? "",
    brand: String(attrs.brand ?? ""),
    model: String(attrs.model ?? preview.displayName),
    gearCategory: String(attrs.gearCategory ?? "racket"),
    priceIdr,
  };
}

export function scrapePreviewToFieldValues(
  sportSlug: string,
  preview: WikiScrapePreview,
): Record<string, unknown> {
  const attrs = normalizeScrapedGearAttributes(preview);
  const category = normalizeGearCategory(String(attrs.gearCategory ?? "racket"));
  const fields = getGearSpecsFields(sportSlug, category);
  const merged: Record<string, unknown> = {
    ...attrs,
    ...preview.specs,
    ...preview.performance,
  };
  const vals: Record<string, unknown> = {};
  for (const f of fields) {
    if (merged[f.key] !== undefined) vals[f.key] = merged[f.key];
  }
  return vals;
}
