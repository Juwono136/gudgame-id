export type GearProductValues = {
  displayName: string;
  slug: string;
  summary: string;
  brand: string;
  model: string;
  gearCategory: string;
  /** Numeric IDR string for input (digits / formatted) */
  priceIdr: string;
};

export const defaultGearProductValues = (): GearProductValues => ({
  displayName: "",
  slug: "",
  summary: "",
  brand: "",
  model: "",
  gearCategory: "racket",
  priceIdr: "",
});
