import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { AuthUser } from "@/db/schema/auth";
import { user } from "@/db/schema/auth";
import type {
  ProfileCompletionSnapshot,
  ProfileMissingField,
} from "@/lib/auth/profile-completion-shared";
import { isUserGender } from "@/lib/constants/user-gender";

export type { ProfileMissingField, ProfileCompletionSnapshot } from "@/lib/auth/profile-completion-shared";

export type ProfileCompletionStatus = {
  isComplete: boolean;
  missingFields: ProfileMissingField[];
  completionPercent: number;
};

const REQUIRED_FIELDS: ProfileMissingField[] = [
  "fullNameKtp",
  "phone",
  "phoneCountryCode",
  "sportInterests",
  "gender",
];

function fieldPresent(
  user: Pick<
    AuthUser,
    "fullNameKtp" | "phone" | "phoneCountryCode" | "sportInterestSlugs" | "gender"
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
    case "sportInterests":
      return Array.isArray(user.sportInterestSlugs) && user.sportInterestSlugs.length > 0;
    case "gender":
      return isUserGender(user.gender ?? "");
    default:
      return true;
  }
}

export function getProfileCompletionStatus(
  user: Pick<
    AuthUser,
    "fullNameKtp" | "phone" | "phoneCountryCode" | "sportInterestSlugs" | "gender"
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

import { filterSportCatalogSlugs } from "@/lib/sports/catalog";

export function normalizeSportInterestSlugs(slugs: string[]): string[] {
  return filterSportCatalogSlugs(slugs);
}

export async function getProfileCompletionSnapshotForUser(
  userId: string,
): Promise<ProfileCompletionSnapshot> {
  const [dbUser] = await getDb()
    .select({
      fullNameKtp: user.fullNameKtp,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      sportInterestSlugs: user.sportInterestSlugs,
      gender: user.gender,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) {
    return {
      profileComplete: true,
      profileCompletionPercent: 100,
      missingProfileFields: [],
    };
  }

  const status = getProfileCompletionStatus(dbUser);
  return {
    profileComplete: status.isComplete,
    profileCompletionPercent: status.completionPercent,
    missingProfileFields: status.missingFields,
  };
}
