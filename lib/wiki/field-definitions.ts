import type { WikiEntityType } from "@/db/schema/wiki";

export type WikiFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "rating"
  | "url";

export type WikiFieldGroup =
  | "identity"
  | "attributes"
  | "performance"
  | "specs"
  | "biodata"
  | "gear";

export type WikiFieldDefinition = {
  key: string;
  label: string;
  type: WikiFieldType;
  group: WikiFieldGroup;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  /** Store in attributes | performance | specs */
  storeIn?: "attributes" | "performance" | "specs";
};

const DEFAULT_PLAYER_FIELDS: WikiFieldDefinition[] = [
  {
    key: "nationality",
    label: "Nationality",
    type: "text",
    group: "biodata",
    storeIn: "attributes",
    placeholder: "e.g. Spain (ESP)",
  },
  {
    key: "age",
    label: "Age",
    type: "number",
    group: "biodata",
    storeIn: "attributes",
    min: 10,
    max: 80,
  },
  {
    key: "yearsActive",
    label: "Years active",
    type: "text",
    group: "biodata",
    storeIn: "attributes",
    placeholder: "e.g. 2010–Present",
  },
  {
    key: "playingStyle",
    label: "Playing style",
    type: "text",
    group: "attributes",
    storeIn: "attributes",
  },
  {
    key: "tier",
    label: "Tier / level",
    type: "select",
    group: "attributes",
    storeIn: "attributes",
    options: [
      { value: "bronze", label: "Bronze" },
      { value: "silver", label: "Silver" },
      { value: "gold", label: "Gold" },
      { value: "pro", label: "Pro / Tour" },
    ],
  },
  {
    key: "worldRank",
    label: "World rank",
    type: "number",
    group: "performance",
    storeIn: "performance",
    min: 1,
  },
  {
    key: "totalPoints",
    label: "Total points",
    type: "number",
    group: "performance",
    storeIn: "performance",
  },
  {
    key: "winRate",
    label: "Win rate (%)",
    type: "rating",
    group: "performance",
    storeIn: "performance",
    min: 0,
    max: 100,
  },
  {
    key: "careerTitles",
    label: "Career titles",
    type: "number",
    group: "performance",
    storeIn: "performance",
  },
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
    key: "agility",
    label: "Agility",
    type: "rating",
    group: "performance",
    storeIn: "performance",
    max: 100,
  },
];

const DEFAULT_TEAM_FIELDS: WikiFieldDefinition[] = [
  {
    key: "worldRank",
    label: "World rank",
    type: "number",
    group: "performance",
    storeIn: "performance",
    min: 1,
  },
  {
    key: "seasonPoints",
    label: "Season points",
    type: "number",
    group: "performance",
    storeIn: "performance",
  },
  {
    key: "titles",
    label: "Titles (season)",
    type: "number",
    group: "performance",
    storeIn: "performance",
  },
  {
    key: "winStreak",
    label: "Win streak",
    type: "number",
    group: "performance",
    storeIn: "performance",
  },
  {
    key: "winRate",
    label: "Win rate (%)",
    type: "rating",
    group: "performance",
    storeIn: "performance",
    max: 100,
  },
  {
    key: "setRatio",
    label: "Set ratio (W/L)",
    type: "text",
    group: "performance",
    storeIn: "performance",
    placeholder: "e.g. 1.42",
  },
];

const PADEL_GEAR_FIELDS: WikiFieldDefinition[] = [
  {
    key: "brand",
    label: "Brand",
    type: "text",
    group: "specs",
    storeIn: "attributes",
    required: true,
  },
  {
    key: "model",
    label: "Model",
    type: "text",
    group: "specs",
    storeIn: "attributes",
  },
  {
    key: "price",
    label: "Price (IDR)",
    type: "text",
    group: "specs",
    storeIn: "attributes",
  },
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
  },
  {
    key: "surface",
    label: "Surface / faces",
    type: "text",
    group: "specs",
    storeIn: "specs",
  },
  {
    key: "core",
    label: "Core",
    type: "text",
    group: "specs",
    storeIn: "specs",
  },
  {
    key: "gearCategory",
    label: "Category",
    type: "select",
    group: "gear",
    storeIn: "attributes",
    options: [
      { value: "racket", label: "Racket" },
      { value: "shoes", label: "Shoes" },
      { value: "bag", label: "Bag" },
      { value: "balls", label: "Balls" },
      { value: "accessory", label: "Accessory" },
      { value: "other", label: "Other" },
    ],
  },
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

const GENERIC_GEAR_FIELDS: WikiFieldDefinition[] = [
  {
    key: "brand",
    label: "Brand",
    type: "text",
    group: "specs",
    storeIn: "attributes",
    required: true,
  },
  {
    key: "gearCategory",
    label: "Category",
    type: "text",
    group: "gear",
    storeIn: "attributes",
    placeholder: "e.g. gloves, racket, shoes",
  },
  {
    key: "material",
    label: "Material",
    type: "text",
    group: "specs",
    storeIn: "specs",
  },
  {
    key: "weight",
    label: "Weight / size",
    type: "text",
    group: "specs",
    storeIn: "specs",
  },
];

const SPORT_OVERRIDES: Partial<
  Record<string, Partial<Record<WikiEntityType, WikiFieldDefinition[]>>>
> = {
  padel: {
    gear: PADEL_GEAR_FIELDS,
  },
};

export function getWikiFieldDefinitions(
  sportSlug: string,
  entityType: WikiEntityType,
): WikiFieldDefinition[] {
  const override = SPORT_OVERRIDES[sportSlug]?.[entityType];
  if (override) return override;

  switch (entityType) {
    case "player":
      return DEFAULT_PLAYER_FIELDS;
    case "team":
      return DEFAULT_TEAM_FIELDS;
    case "gear":
      return GENERIC_GEAR_FIELDS;
    default:
      return [];
  }
}

export function partitionFieldValues(
  fields: WikiFieldDefinition[],
  values: Record<string, unknown>,
): {
  attributes: Record<string, unknown>;
  performance: Record<string, unknown>;
  specs: Record<string, unknown>;
} {
  const attributes: Record<string, unknown> = {};
  const performance: Record<string, unknown> = {};
  const specs: Record<string, unknown> = {};

  for (const field of fields) {
    const v = values[field.key];
    if (v === undefined || v === null || v === "") continue;
    const bucket = field.storeIn ?? "attributes";
    if (bucket === "performance") performance[field.key] = v;
    else if (bucket === "specs") specs[field.key] = v;
    else attributes[field.key] = v;
  }

  return { attributes, performance, specs };
}

export function mergeFieldValues(
  fields: WikiFieldDefinition[],
  entity: {
    attributes: Record<string, unknown>;
    performance: Record<string, unknown>;
    specs: Record<string, unknown>;
  },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const bucket = field.storeIn ?? "attributes";
    const source =
      bucket === "performance"
        ? entity.performance
        : bucket === "specs"
          ? entity.specs
          : entity.attributes;
    if (source[field.key] !== undefined) out[field.key] = source[field.key];
  }
  return out;
}
