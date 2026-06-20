import { SPORT_FIELD_LIMITS } from "@/lib/sports/field-limits";
import { slugifyWikiName } from "@/lib/wiki/slug";

export type SportFormFieldErrors = Partial<
  Record<"name" | "tagline" | "description" | "rulesSummary", string>
>;

export function validateSportFormInput(input: {
  name: string;
  tagline: string;
  description: string;
  rulesSummary: string;
}): { ok: boolean; errors: SportFormFieldErrors } {
  const errors: SportFormFieldErrors = {};
  const name = input.name.trim();

  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > SPORT_FIELD_LIMITS.name) {
    errors.name = `Name must be ${SPORT_FIELD_LIMITS.name} characters or fewer.`;
  }

  const slug = slugifyWikiName(name);
  if (name.length >= 2 && !slug) {
    errors.name = "Name must produce a valid URL slug.";
  }

  if (input.tagline.length > SPORT_FIELD_LIMITS.tagline) {
    errors.tagline = `Tagline must be ${SPORT_FIELD_LIMITS.tagline} characters or fewer.`;
  }

  if (input.description.length > SPORT_FIELD_LIMITS.description) {
    errors.description = `Description must be ${SPORT_FIELD_LIMITS.description.toLocaleString()} characters or fewer.`;
  }

  if (input.rulesSummary.length > SPORT_FIELD_LIMITS.rulesSummary) {
    errors.rulesSummary = `Rules must be ${SPORT_FIELD_LIMITS.rulesSummary.toLocaleString()} characters or fewer.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
