import "server-only";

import type { AuthUser } from "@/db/schema/auth";
import type { ProfileMissingField } from "@/lib/auth/profile-completion-shared";

export type { ProfileMissingField } from "@/lib/auth/profile-completion-shared";

export type ProfileCompletionStatus = {
  isComplete: boolean;
  missingFields: ProfileMissingField[];
  completionPercent: number;
};

const REQUIRED_FIELDS: ProfileMissingField[] = [
  "fullNameKtp",
  "phone",
  "phoneCountryCode",
  "photo",
];

function fieldPresent(
  user: Pick<
    AuthUser,
    "fullNameKtp" | "phone" | "phoneCountryCode" | "image" | "imageStorageKey"
  >,
  field: ProfileMissingField,
): boolean {
  switch (field) {
    case "fullNameKtp":
      return Boolean(user.fullNameKtp?.trim() && user.fullNameKtp.trim().length >= 3);
    case "phone":
      return Boolean(user.phone?.trim() && user.phone.trim().length >= 8);
    case "phoneCountryCode":
      return Boolean(user.phoneCountryCode?.trim());
    case "photo":
      return Boolean(user.image?.trim() || user.imageStorageKey?.trim());
    default:
      return true;
  }
}

export function getProfileCompletionStatus(
  user: Pick<
    AuthUser,
    "fullNameKtp" | "phone" | "phoneCountryCode" | "image" | "imageStorageKey"
  >,
): ProfileCompletionStatus {
  const missingFields = REQUIRED_FIELDS.filter((f) => !fieldPresent(user, f));
  const filled = REQUIRED_FIELDS.length - missingFields.length;
  const completionPercent = Math.round((filled / REQUIRED_FIELDS.length) * 100);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercent,
  };
}
