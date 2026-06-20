import type { WikiFieldDefinition } from "@/lib/wiki/field-definitions";
import type { GearCategory } from "@/lib/wiki/gear/constants";

const PADEL_RACKET_SPECS: WikiFieldDefinition[] = [
  {
    key: "shape",
    label: "Shape",
    type: "select",
    group: "specs",
    storeIn: "specs",
    options: [
      { value: "diamond", label: "Diamond" },
      { value: "round", label: "Round" },
      { value: "teardrop", label: "Teardrop" },
    ],
  },
  {
    key: "weight",
    label: "Weight",
    type: "text",
    group: "specs",
    storeIn: "specs",
    placeholder: "e.g. 365g ±10g",
  },
  {
    key: "balance",
    label: "Balance",
    type: "text",
    group: "specs",
    storeIn: "specs",
    placeholder: "e.g. Medium-high",
  },
  {
    key: "surface",
    label: "Surface / faces",
    type: "text",
    group: "specs",
    storeIn: "specs",
    placeholder: "e.g. 3K carbon",
  },
  {
    key: "core",
    label: "Core",
    type: "text",
    group: "specs",
    storeIn: "specs",
    placeholder: "e.g. EVA Soft",
  },
];

const PADEL_RACKET_PERFORMANCE: WikiFieldDefinition[] = [
  {
    key: "power",
    label: "Power",
    type: "rating",
    group: "performance",
    storeIn: "performance",
    max: 100,
  },
  {
    key: "control",
    label: "Control",
    type: "rating",
    group: "performance",
    storeIn: "performance",
    max: 100,
  },
  {
    key: "maneuverability",
    label: "Maneuverability",
    type: "rating",
    group: "performance",
    storeIn: "performance",
    max: 100,
  },
];

const GENERIC_SPECS: WikiFieldDefinition[] = [
  {
    key: "material",
    label: "Material",
    type: "text",
    group: "specs",
    storeIn: "specs",
    placeholder: "e.g. Carbon fiber, leather",
  },
  {
    key: "weight",
    label: "Weight / size",
    type: "text",
    group: "specs",
    storeIn: "specs",
    placeholder: "e.g. 365g, EU 42, 30L",
  },
];

const CATEGORY_HINTS: Partial<Record<GearCategory, string>> = {
  racket:
    "Padel racket specs help players compare shape, weight, and feel. All fields are optional.",
  shoes: "Size, material, and sole type help players pick footwear. All fields are optional.",
  bag: "Capacity and material are enough for most bags. All fields are optional.",
  balls: "Ball type and pack size are usually enough. All fields are optional.",
  grip: "Thickness and material are the main details. All fields are optional.",
  apparel: "Material and fit notes are usually enough. All fields are optional.",
  accessory: "Brief material or compatibility notes are enough. All fields are optional.",
  other: "Add any technical notes that help players understand this product.",
};

export function getGearSpecsHint(category: GearCategory): string {
  return CATEGORY_HINTS[category] ?? CATEGORY_HINTS.other!;
}

export function getGearSpecsFields(
  sportSlug: string,
  category: GearCategory,
): WikiFieldDefinition[] {
  if (category === "racket" && sportSlug === "padel") {
    return [...PADEL_RACKET_SPECS, ...PADEL_RACKET_PERFORMANCE];
  }
  return GENERIC_SPECS;
}
