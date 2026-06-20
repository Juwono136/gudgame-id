import type { GearCategory } from "@/lib/wiki/gear/constants";

export const GEAR_SPEC_FIELD_LABELS: Record<string, string> = {
  shape: "Shape",
  weight: "Weight",
  balance: "Balance",
  surface: "Surface / faces",
  core: "Core",
  material: "Material",
};

export const GEAR_PERFORMANCE_LABELS: Record<string, string> = {
  power: "Power",
  control: "Control",
  maneuverability: "Maneuverability",
};

export const GEAR_SHAPE_LABELS: Record<string, string> = {
  diamond: "Diamond",
  round: "Round",
  teardrop: "Teardrop",
};

export function formatGearSpecValue(key: string, value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (key === "shape") return GEAR_SHAPE_LABELS[raw] ?? raw;
  return raw;
}

export function isFilledSpecValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return String(value).trim() !== "";
}

export function getFilledGearSpecs(
  specs: Record<string, unknown>,
): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(specs)) {
    if (!isFilledSpecValue(value)) continue;
    items.push({
      label: GEAR_SPEC_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim(),
      value: formatGearSpecValue(key, value),
    });
  }
  return items;
}

export function getFilledGearPerformance(
  performance: Record<string, unknown>,
): { label: string; value: number; max: number }[] {
  const items: { label: string; value: number; max: number }[] = [];
  for (const [key, value] of Object.entries(performance)) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    items.push({
      label: GEAR_PERFORMANCE_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim(),
      value: Math.round(n),
      max: 100,
    });
  }
  return items;
}

export function hasAnyGearTechnicalData(
  specs: Record<string, unknown>,
  performance: Record<string, unknown>,
): boolean {
  return (
    getFilledGearSpecs(specs).length > 0 || getFilledGearPerformance(performance).length > 0
  );
}

export function gearProductAtAGlance(
  attributes: Record<string, unknown>,
  category: GearCategory,
  categoryLabel: string,
  priceDisplay: string | null,
): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const brand = String(attributes.brand ?? "").trim();
  const model = String(attributes.model ?? "").trim();
  if (brand) items.push({ label: "Brand", value: brand });
  if (model) items.push({ label: "Model", value: model });
  if (categoryLabel) items.push({ label: "Category", value: categoryLabel });
  if (priceDisplay) items.push({ label: "Price", value: priceDisplay });
  void category;
  return items;
}
