import { stripHtmlTags } from "@/lib/html/strip-html";
import {
  PLAYER_AGE_MAX,
  PLAYER_AGE_MIN,
  PLAYER_BIOGRAPHY_MAX,
  PLAYER_DISPLAY_NAME_MAX,
  PLAYER_NATIONALITY_MAX,
  PLAYER_NICKNAME_MAX,
  PLAYER_SLUG_MAX,
  PLAYER_SUMMARY_MAX,
} from "@/lib/wiki/player-profile-fields";

export type PlayerWizardFieldErrors = Partial<
  Record<
    | "displayName"
    | "nickname"
    | "slug"
    | "summary"
    | "biography"
    | "nationality"
    | "age",
    string
  >
>;

export function validatePlayerWizardFields(input: {
  displayName: string;
  nickname: string;
  slug: string;
  summary: string;
  biography: string;
  nationality: string;
  age: string;
}): PlayerWizardFieldErrors {
  const errors: PlayerWizardFieldErrors = {};
  const name = input.displayName.trim();

  if (!name) {
    errors.displayName = "Full name is required";
  } else if (name.length > PLAYER_DISPLAY_NAME_MAX) {
    errors.displayName = `Maximum ${PLAYER_DISPLAY_NAME_MAX} characters`;
  }

  if (input.nickname.trim().length > PLAYER_NICKNAME_MAX) {
    errors.nickname = `Maximum ${PLAYER_NICKNAME_MAX} characters`;
  }

  const slugVal = input.slug.trim();
  if (slugVal.length > PLAYER_SLUG_MAX) {
    errors.slug = `Maximum ${PLAYER_SLUG_MAX} characters`;
  } else if (slugVal && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugVal)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only";
  }

  if (input.nationality.trim().length > PLAYER_NATIONALITY_MAX) {
    errors.nationality = `Maximum ${PLAYER_NATIONALITY_MAX} characters`;
  }

  if (input.age.trim()) {
    const age = Number(input.age);
    if (!Number.isFinite(age) || age < PLAYER_AGE_MIN || age > PLAYER_AGE_MAX) {
      errors.age = `Age must be between ${PLAYER_AGE_MIN} and ${PLAYER_AGE_MAX}`;
    }
  }

  if (input.summary.length > PLAYER_SUMMARY_MAX) {
    errors.summary = `Tagline exceeds ${PLAYER_SUMMARY_MAX} characters`;
  }

  if (input.biography.length > PLAYER_BIOGRAPHY_MAX) {
    errors.biography = `Biography exceeds ${PLAYER_BIOGRAPHY_MAX} characters`;
  }

  return errors;
}

export function hasRichTextContent(html: string): boolean {
  return stripHtmlTags(html).length > 0;
}
