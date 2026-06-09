import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";

export type PlayerPageMissingField =
  | "playerProfile"
  | "summary"
  | "biography"
  | "nationality"
  | "age"
  | "equipment"
  | "signatureGear"
  | "socialLinks"
  | "gallery";

const FIELD_LABELS: Record<PlayerPageMissingField, string> = {
  playerProfile: "Create your public player page",
  summary: "Short tagline",
  biography: "Biography",
  nationality: "Nationality",
  age: "Age",
  equipment: "Equipment list",
  signatureGear: "Signature gear",
  socialLinks: "Social media links",
  gallery: "Photo gallery",
};

const PROFILE_DETAIL_FIELDS: PlayerPageMissingField[] = [
  "summary",
  "biography",
  "nationality",
  "age",
  "equipment",
  "signatureGear",
  "socialLinks",
  "gallery",
];

export type PlayerPageCompletionStatus = {
  isComplete: boolean;
  missingFields: PlayerPageMissingField[];
  completionPercent: number;
};

export function getPlayerPageMissingFieldLabels(
  fields: PlayerPageMissingField[],
): string[] {
  return fields.map((f) => FIELD_LABELS[f]);
}

function hasBiography(profile: PlayerWikiProfileView): boolean {
  const text = sanitizeRichText(profile.biography ?? "");
  return text.replace(/<[^>]+>/g, "").trim().length >= 20;
}

function fieldPresent(
  profile: PlayerWikiProfileView | null,
  field: PlayerPageMissingField,
): boolean {
  if (!profile) return field !== "playerProfile" ? false : false;

  switch (field) {
    case "playerProfile":
      return true;
    case "summary":
      return Boolean(profile.summary?.trim() && profile.summary.trim().length >= 3);
    case "biography":
      return hasBiography(profile);
    case "nationality":
      return Boolean(profile.nationality?.trim());
    case "age":
      return profile.age != null && profile.age >= 10;
    case "equipment":
      return profile.equipment.length > 0;
    case "signatureGear":
      return Boolean(profile.signatureGear);
    case "socialLinks":
      return profile.socialLinks.length > 0;
    case "gallery":
      return profile.gallery.some((g) => Boolean(g.url));
    default:
      return true;
  }
}

export function getPlayerPageCompletionStatus(
  profile: PlayerWikiProfileView | null,
): PlayerPageCompletionStatus {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: ["playerProfile"],
      completionPercent: 0,
    };
  }

  const missingFields = PROFILE_DETAIL_FIELDS.filter(
    (field) => !fieldPresent(profile, field),
  );

  const filled = PROFILE_DETAIL_FIELDS.length - missingFields.length;
  const completionPercent = Math.round(
    (filled / PROFILE_DETAIL_FIELDS.length) * 100,
  );

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercent,
  };
}
