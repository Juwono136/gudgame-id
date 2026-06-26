/** Hero backgrounds for auth split layout (public/images) */
export const authBackgrounds = {
  login: "/images/bg-03.jpg",
  register: "/images/bg-07.jpg",
} as const;

export type AuthShellVariant = keyof typeof authBackgrounds;
