export const GEAR_CATEGORIES = [
  "racket",
  "shoes",
  "bag",
  "balls",
  "grip",
  "apparel",
  "accessory",
  "other",
] as const;

export type GearCategory = (typeof GEAR_CATEGORIES)[number];

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  racket: "Racket",
  shoes: "Shoes",
  bag: "Bag",
  balls: "Balls",
  grip: "Grip",
  apparel: "Apparel",
  accessory: "Accessory",
  other: "Other",
};

export const GEAR_NAME_MAX = 200;
export const GEAR_BRAND_MAX = 80;
export const GEAR_MODEL_MAX = 120;
export const GEAR_SLUG_MAX = 120;
export const GEAR_SUMMARY_MAX = 12000;
export const GEAR_PRICE_MAX_IDR = 999_999_999;
export const GEAR_NOTES_MAX = 500;

export const SCRAPE_PARSER_PROFILES = [
  "padeltop",
  "padelful",
  "padelracket",
  "decathlon",
  "generic",
] as const;

export type ScrapeParserProfile = (typeof SCRAPE_PARSER_PROFILES)[number];

export const SCRAPE_PARSER_LABELS: Record<ScrapeParserProfile, string> = {
  padeltop: "PadelTop",
  padelful: "Padelful",
  padelracket: "Padel Racket",
  decathlon: "Decathlon",
  generic: "Generic product page",
};
