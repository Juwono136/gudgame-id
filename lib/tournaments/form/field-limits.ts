/** Client + server field limits (aligned with `tournamentUpsertSchema`). */
export const TOURNAMENT_FIELD_LIMITS = {
  name: 200,
  slug: 120,
  summary: 500,
  description: 20_000,
  categoryLabel: 80,
  venue: 200,
  rules: 50_000,
  eligibilityRules: 50_000,
  matchFormatRules: 50_000,
  equipmentStandardsRules: 50_000,
} as const;

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlCharCount(html: string): number {
  return html.length;
}
