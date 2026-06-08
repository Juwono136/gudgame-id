import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import type { GearProductValues } from "@/lib/wiki/gear-form";
import { getWikiFieldDefinitions } from "@/lib/wiki/field-definitions";

export function scrapePreviewToGearProduct(preview: WikiScrapePreview): GearProductValues {
  const attrs = preview.attributes;
  return {
    displayName: preview.displayName,
    slug: "",
    summary: preview.summary ?? "",
    brand: String(attrs.brand ?? ""),
    model: String(attrs.model ?? preview.displayName),
    gearCategory: String(attrs.gearCategory ?? "racket"),
    price: String(attrs.price ?? ""),
  };
}

export function scrapePreviewToFieldValues(
  sportSlug: string,
  preview: WikiScrapePreview,
): Record<string, unknown> {
  const fields = getWikiFieldDefinitions(sportSlug, "gear");
  const merged: Record<string, unknown> = {
    ...preview.attributes,
    ...preview.specs,
    ...preview.performance,
  };
  const vals: Record<string, unknown> = {};
  for (const f of fields) {
    if (merged[f.key] !== undefined) vals[f.key] = merged[f.key];
  }
  return vals;
}
