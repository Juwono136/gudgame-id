import { formatIdrDisplay } from "@/lib/format/currency";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import {
  GEAR_CATEGORY_LABELS,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import { buildGearPriceFields, normalizeGearCategory } from "@/lib/wiki/gear/validation";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import type { PlayerEquipmentCategory } from "@/lib/wiki/player-equipment";

export type GearSearchListItem = {
  id: string;
  slug: string;
  displayName: string;
  brand: string | null;
  gearCategory: GearCategory;
  gearCategoryLabel: string;
  priceDisplay: string | null;
  primaryImageUrl: string | null;
};

export type GearPlayerSlotView = {
  gearEntityId: string;
  slug: string;
  name: string;
  brand: string | null;
  category: PlayerEquipmentCategory;
  priceDisplay: string | null;
  imageUrl: string | null;
  publicUrl: string;
};

type GearRowLike = {
  id: string;
  slug: string;
  displayName: string;
  primaryImageUrl?: string | null;
  primaryImageStorageKey?: string | null;
  attributes?: unknown;
};

function readAttr(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function readPriceDisplay(attrs: Record<string, unknown>): string | null {
  const display = readAttr(attrs, "priceDisplay") ?? readAttr(attrs, "price");
  if (display) return display;
  const raw = attrs.priceIdr;
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : null;
  if (n != null && Number.isFinite(n) && n > 0) return formatIdrDisplay(n);
  return null;
}

export function mapGearEntityToListItem(
  row: GearRowLike,
  sportSlug?: string,
): GearSearchListItem {
  const attrs = ((row.attributes ?? {}) as Record<string, unknown>);
  const category = normalizeGearCategory(readAttr(attrs, "gearCategory") ?? undefined);

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    brand: readAttr(attrs, "brand"),
    gearCategory: category,
    gearCategoryLabel: GEAR_CATEGORY_LABELS[category],
    priceDisplay: readPriceDisplay(attrs),
    primaryImageUrl: resolveWikiImageUrl(
      row.primaryImageUrl ?? null,
      row.primaryImageStorageKey ?? null,
    ),
  };
}

export function mapGearEntityToPlayerSlot(
  row: GearRowLike,
  sportSlug: string,
): GearPlayerSlotView {
  const item = mapGearEntityToListItem(row, sportSlug);
  return {
    gearEntityId: row.id,
    slug: row.slug,
    name: row.displayName,
    brand: item.brand,
    category: item.gearCategory as PlayerEquipmentCategory,
    priceDisplay: item.priceDisplay,
    imageUrl: item.primaryImageUrl,
    publicUrl: `/sports/${sportSlug}/gear/${row.slug}`,
  };
}

export function normalizeScrapedGearAttributes(
  preview: WikiScrapePreview,
): Record<string, unknown> {
  const attrs = { ...preview.attributes };
  const category = normalizeGearCategory(String(attrs.gearCategory ?? "racket"));
  attrs.gearCategory = category;

  let priceIdr: number | null = null;
  const rawPrice = attrs.priceIdr ?? attrs.price;
  if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
    priceIdr = Math.round(rawPrice);
  } else if (typeof rawPrice === "string" && rawPrice.trim()) {
    const digits = rawPrice.replace(/[^\d]/g, "");
    if (digits) priceIdr = Number(digits);
  }

  const priceFields = buildGearPriceFields(priceIdr);
  attrs.priceIdr = priceFields.priceIdr;
  attrs.priceDisplay = priceFields.priceDisplay;
  if (priceFields.priceDisplay) {
    attrs.price = priceFields.priceDisplay;
  }

  if (!attrs.brand && preview.displayName) {
    attrs.brand = "";
  }
  if (!attrs.model) {
    attrs.model = preview.displayName;
  }

  return attrs;
}

export function gearProductToAttributes(input: {
  brand: string;
  model: string;
  gearCategory: string;
  priceIdr: string;
}): Record<string, unknown> {
  const category = normalizeGearCategory(input.gearCategory);
  let priceIdr: number | null = null;
  if (input.priceIdr.trim()) {
    const n = Number(input.priceIdr.replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n >= 0) priceIdr = Math.round(n);
  }
  const priceFields = buildGearPriceFields(priceIdr);
  return {
    brand: input.brand.trim(),
    model: input.model.trim() || undefined,
    gearCategory: category,
    priceIdr: priceFields.priceIdr,
    priceDisplay: priceFields.priceDisplay,
    price: priceFields.priceDisplay || undefined,
  };
}
