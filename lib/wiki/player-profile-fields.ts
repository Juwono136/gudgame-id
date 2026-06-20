import { z } from "zod";

export const PLAYER_DISPLAY_NAME_MAX = 120;
export const PLAYER_NICKNAME_MAX = 120;
export const PLAYER_SLUG_MAX = 120;

/** Public player name is derived from account full name (KTP name preferred). */
export function resolvePlayerDisplayNameFromAccount(account: {
  fullNameKtp: string | null;
  name: string | null;
}): string {
  return (account.fullNameKtp?.trim() || account.name?.trim() || "").slice(
    0,
    PLAYER_DISPLAY_NAME_MAX,
  );
}
export const PLAYER_SUMMARY_MAX = 500;
export const PLAYER_BIOGRAPHY_MAX = 20000;
export const PLAYER_NATIONALITY_MAX = 80;
export const PLAYER_AGE_MIN = 10;
export const PLAYER_AGE_MAX = 80;
export const PLAYER_SOCIAL_LINKS_MAX = 3;
export const PLAYER_SOCIAL_LABEL_MAX = 40;

export const playerSocialLinkSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(PLAYER_SOCIAL_LABEL_MAX),
  url: z.string().trim().url("Enter a valid URL").max(500),
});

export type PlayerSocialLink = z.infer<typeof playerSocialLinkSchema>;

export const playerSocialLinksSchema = z
  .array(playerSocialLinkSchema)
  .max(PLAYER_SOCIAL_LINKS_MAX);

export type PlayerProfileEditableAttributes = {
  nationality?: string;
  age?: number | null;
  socialLinks?: PlayerSocialLink[];
  signatureGearId?: string | null;
  /** ISO date — pro career start; tournaments may refine this later */
  proSince?: string | null;
  /** ISO date — first recorded tournament match */
  firstTournamentAt?: string | null;
};

export function parseSocialLinks(value: unknown): PlayerSocialLink[] {
  const parsed = playerSocialLinksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parsePlayerEditableAttributes(
  attributes: Record<string, unknown>,
): PlayerProfileEditableAttributes {
  const ageRaw = attributes.age;
  const age =
    typeof ageRaw === "number"
      ? ageRaw
      : typeof ageRaw === "string" && ageRaw.trim()
        ? Number(ageRaw)
        : null;

  return {
    nationality:
      typeof attributes.nationality === "string" ? attributes.nationality : undefined,
    age: Number.isFinite(age) ? age : null,
    socialLinks: parseSocialLinks(attributes.socialLinks),
    signatureGearId:
      typeof attributes.signatureGearId === "string"
        ? attributes.signatureGearId
        : null,
    proSince:
      typeof attributes.proSince === "string" ? attributes.proSince : null,
    firstTournamentAt:
      typeof attributes.firstTournamentAt === "string"
        ? attributes.firstTournamentAt
        : null,
  };
}

export function mergePlayerEditableAttributes(
  base: Record<string, unknown>,
  patch: PlayerProfileEditableAttributes,
): Record<string, unknown> {
  const next = { ...base };

  if (patch.nationality !== undefined) {
    const trimmed = patch.nationality.trim();
    if (trimmed) next.nationality = trimmed;
    else delete next.nationality;
  }

  if (patch.age !== undefined) {
    if (patch.age === null) delete next.age;
    else next.age = patch.age;
  }

  if (patch.socialLinks !== undefined) {
    next.socialLinks = patch.socialLinks;
  }

  if (patch.signatureGearId !== undefined) {
    if (patch.signatureGearId) next.signatureGearId = patch.signatureGearId;
    else delete next.signatureGearId;
  }

  return next;
}
