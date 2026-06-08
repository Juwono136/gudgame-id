export type ProfileMissingField =
  | "phone"
  | "phoneCountryCode"
  | "fullNameKtp"
  | "photo";

const FIELD_LABELS: Record<ProfileMissingField, string> = {
  fullNameKtp: "Legal full name",
  phone: "Phone / WhatsApp number",
  phoneCountryCode: "Phone country code",
  photo: "Profile photo",
};

export function getProfileMissingFieldLabels(
  fields: ProfileMissingField[],
): string[] {
  return fields.map((f) => FIELD_LABELS[f]);
}
