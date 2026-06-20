/** Client + server field limits for sport admin forms (aligned with sportUpsertSchema). */
export const SPORT_FIELD_LIMITS = {
  name: 50,
  tagline: 160,
  description: 5000,
  rulesSummary: 50_000,
} as const;

export type SportFieldLimitKey = keyof typeof SPORT_FIELD_LIMITS;
