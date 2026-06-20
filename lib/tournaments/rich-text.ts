import {
  coerceRichHtmlField,
  sanitizeTournamentRichField,
} from "@/lib/wiki/sanitize-rich-text";

export { coerceRichHtmlField, sanitizeTournamentRichField };

export function sanitizeTournamentRichFields(input: {
  summary?: string | null;
  description?: string | null;
  rules?: string | null;
  eligibilityRules?: string | null;
  matchFormatRules?: string | null;
  equipmentStandardsRules?: string | null;
}) {
  return {
    summary: sanitizeTournamentRichField(input.summary),
    description: sanitizeTournamentRichField(input.description),
    rules: sanitizeTournamentRichField(input.rules),
    eligibilityRules: sanitizeTournamentRichField(input.eligibilityRules),
    matchFormatRules: sanitizeTournamentRichField(input.matchFormatRules),
    equipmentStandardsRules: sanitizeTournamentRichField(input.equipmentStandardsRules),
  };
}

export function coerceTournamentRichFields(input: {
  summary?: string | null;
  description?: string | null;
  rules?: string | null;
}) {
  return {
    summary: coerceRichHtmlField(input.summary),
    description: coerceRichHtmlField(input.description),
    rules: coerceRichHtmlField(input.rules),
  };
}
