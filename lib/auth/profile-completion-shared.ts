export type ProfileMissingField =
  | "phone"
  | "phoneCountryCode"
  | "fullNameKtp"
  | "sportInterests"
  | "gender";

/** Serializable profile completion state for SSR + client components. */
export type ProfileCompletionSnapshot = {
  profileComplete: boolean;
  profileCompletionPercent: number;
  missingProfileFields: ProfileMissingField[];
};

const FIELD_LABELS: Record<ProfileMissingField, string> = {
  fullNameKtp: "Legal full name",
  phone: "Phone / WhatsApp number",
  phoneCountryCode: "Phone country code",
  sportInterests: "Sports you follow",
  gender: "Gender",
};

export function getProfileMissingFieldLabels(
  fields: ProfileMissingField[],
): string[] {
  return fields.map((f) => FIELD_LABELS[f]);
}
