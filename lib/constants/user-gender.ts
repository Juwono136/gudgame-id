export const USER_GENDERS = ["male", "female"] as const;
export type UserGender = (typeof USER_GENDERS)[number];

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  male: "Male",
  female: "Female",
};

export function formatUserGender(gender: string | null | undefined): string | null {
  if (!gender) return null;
  if (gender === "male" || gender === "female") return USER_GENDER_LABELS[gender];
  return null;
}

export function isUserGender(value: string): value is UserGender {
  return USER_GENDERS.includes(value as UserGender);
}
