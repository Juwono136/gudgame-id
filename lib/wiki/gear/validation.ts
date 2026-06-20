import { z } from "zod";
import { formatIdrDisplay } from "@/lib/format/currency";
import {
  GEAR_BRAND_MAX,
  GEAR_CATEGORIES,
  GEAR_MODEL_MAX,
  GEAR_NAME_MAX,
  GEAR_NOTES_MAX,
  GEAR_PRICE_MAX_IDR,
  GEAR_SUMMARY_MAX,
  type GearCategory,
} from "@/lib/wiki/gear/constants";

export const gearCategorySchema = z.enum(GEAR_CATEGORIES);

export const gearAttributesSchema = z
  .object({
    brand: z.string().trim().max(GEAR_BRAND_MAX).optional(),
    model: z.string().trim().max(GEAR_MODEL_MAX).optional(),
    gearCategory: gearCategorySchema.optional(),
    priceIdr: z.coerce.number().int().min(0).max(GEAR_PRICE_MAX_IDR).optional().nullable(),
    priceDisplay: z.string().trim().max(40).optional(),
    price: z.string().trim().max(40).optional(),
  })
  .passthrough();

export type GearAttributes = z.infer<typeof gearAttributesSchema>;

export function normalizeGearCategory(raw: string | null | undefined): GearCategory {
  const key = raw?.trim().toLowerCase();
  if (key && GEAR_CATEGORIES.includes(key as GearCategory)) {
    return key as GearCategory;
  }
  return "other";
}

export function buildGearPriceFields(priceIdr: number | null | undefined): {
  priceIdr: number | null;
  priceDisplay: string;
} {
  if (priceIdr == null || priceIdr <= 0) {
    return { priceIdr: null, priceDisplay: "" };
  }
  return {
    priceIdr,
    priceDisplay: formatIdrDisplay(priceIdr),
  };
}

export type GearProductFormState = {
  displayName: string;
  slug: string;
  summary: string;
  brand: string;
  model: string;
  gearCategory: string;
  priceIdr: string;
};

export function validateGearProductStep(data: GearProductFormState): string | null {
  const name = data.displayName.trim();
  if (!name) return "Product name is required.";
  if (name.length < 2) return "Product name must be at least 2 characters.";
  if (name.length > GEAR_NAME_MAX) {
    return `Product name must be at most ${GEAR_NAME_MAX} characters.`;
  }

  const brand = data.brand.trim();
  if (!brand) return "Brand is required.";
  if (brand.length > GEAR_BRAND_MAX) {
    return `Brand must be at most ${GEAR_BRAND_MAX} characters.`;
  }

  if (data.model.trim().length > GEAR_MODEL_MAX) {
    return `Model must be at most ${GEAR_MODEL_MAX} characters.`;
  }

  if (!data.gearCategory.trim()) return "Category is required.";
  normalizeGearCategory(data.gearCategory);

  if (data.priceIdr.trim()) {
    const cleaned = data.priceIdr.replace(/[^\d]/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return "Enter a valid price in IDR.";
    if (n > GEAR_PRICE_MAX_IDR) return "Price exceeds maximum allowed.";
  }

  if (data.summary.length > GEAR_SUMMARY_MAX) {
    return `Description must be at most ${GEAR_SUMMARY_MAX.toLocaleString()} characters.`;
  }

  return null;
}

export const playerGearCreateSchema = z.object({
  displayName: z.string().trim().min(2).max(GEAR_NAME_MAX),
  brand: z.string().trim().min(1).max(GEAR_BRAND_MAX),
  gearCategory: gearCategorySchema,
  priceIdr: z.coerce.number().int().min(0).max(GEAR_PRICE_MAX_IDR).optional().nullable(),
  notes: z.string().trim().max(GEAR_NOTES_MAX).optional().or(z.literal("")),
});

export type PlayerGearCreateInput = z.infer<typeof playerGearCreateSchema>;
