import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

/** Public site path, absolute http(s), or mailto. */
export const siteLinkHrefSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(500, "URL is too long")
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("https://") ||
      value.startsWith("http://") ||
      value.startsWith("mailto:"),
    "Use a site path (/…), https URL, or mailto: link",
  );

export const siteImageUrlSchema = z
  .string()
  .trim()
  .max(800)
  .refine(
    (value) =>
      !value ||
      value.startsWith("/") ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    "Image must be a site path or https URL",
  );

export const FOOTER_SOCIAL_PLATFORMS = [
  "instagram",
  "youtube",
  "tiktok",
  "twitter",
  "facebook",
  "linkedin",
  "custom",
] as const;

export type FooterSocialPlatform = (typeof FOOTER_SOCIAL_PLATFORMS)[number];

const footerLinkSchema = z.object({
  label: trimmed(60).min(1, "Label is required"),
  href: siteLinkHrefSchema,
});

const socialLinkSchema = z.object({
  platform: z.enum(FOOTER_SOCIAL_PLATFORMS),
  label: trimmed(60).min(1, "Label is required"),
  href: siteLinkHrefSchema,
});

export const homepageHeroSettingsSchema = z.object({
  badgeText: trimmed(80).min(1, "Badge text is required"),
  logoUrl: siteImageUrlSchema,
  logoAlt: trimmed(120).min(1, "Logo alt text is required"),
  bannerImageUrl: siteImageUrlSchema,
  bannerAlt: trimmed(200),
  title: trimmed(120).min(1, "Title is required"),
  titleHighlight: trimmed(120),
  subtitle: trimmed(600).min(1, "Subtitle is required"),
  searchPlaceholder: trimmed(120).min(1, "Search placeholder is required"),
});

export const homepageSportsSectionSettingsSchema = z.object({
  badgeText: trimmed(80).min(1, "Badge text is required"),
  title: trimmed(120).min(1, "Title is required"),
  subtitle: trimmed(600).min(1, "Subtitle is required"),
  /** When true, append “N sports live now…” after the subtitle. */
  includeLiveCount: z.boolean(),
  emptyStateText: trimmed(240).min(1, "Empty state text is required"),
});

export const homepageFooterSettingsSchema = z.object({
  logoUrl: siteImageUrlSchema,
  logoAlt: trimmed(120).min(1, "Logo alt text is required"),
  description: trimmed(2000).min(1, "Description is required"),
  companyName: trimmed(160).min(1, "Company name is required"),
  supportEmail: z
    .string()
    .trim()
    .min(1, "Support email is required")
    .max(160)
    .email("Enter a valid email"),
  address: trimmed(320).min(1, "Address is required"),
  siteColumnTitle: trimmed(40).min(1, "Site column title is required"),
  siteLinks: z.array(footerLinkSchema).max(12, "Maximum 12 site links"),
  legalColumnTitle: trimmed(40).min(1, "Legal column title is required"),
  legalLinks: z.array(footerLinkSchema).max(12, "Maximum 12 legal links"),
  connectColumnTitle: trimmed(40).min(1, "Connect column title is required"),
  socialLinks: z.array(socialLinkSchema).max(12, "Maximum 12 social links"),
  copyrightSuffix: trimmed(160).min(1, "Copyright line is required"),
});

export const homepageAboutSettingsSchema = z.object({
  badgeText: trimmed(80).min(1, "Badge text is required"),
  title: trimmed(120).min(1, "Title is required"),
  subtitle: trimmed(400).min(1, "Subtitle is required"),
  bannerImageUrl: siteImageUrlSchema,
  bannerAlt: trimmed(200),
  imageUrl: siteImageUrlSchema,
  imageAlt: trimmed(200),
  description: trimmed(20000).min(1, "Description is required"),
  missionTitle: trimmed(120).min(1, "Mission title is required"),
  missionBody: trimmed(1200).min(1, "Mission body is required"),
});

export const homepageContactSettingsSchema = z.object({
  badgeText: trimmed(80).min(1, "Badge text is required"),
  title: trimmed(120).min(1, "Title is required"),
  subtitle: trimmed(400).min(1, "Subtitle is required"),
  bannerImageUrl: siteImageUrlSchema,
  bannerAlt: trimmed(200),
  description: trimmed(4000).min(1, "Description is required"),
  introCardTitle: trimmed(80).min(1, "Intro card title is required"),
  introCardSubtitle: trimmed(240).min(1, "Intro card subtitle is required"),
  legalSectionTitle: trimmed(80).min(1, "Legal section title is required"),
  productName: trimmed(80).min(1, "Product name is required"),
  companyLegalName: trimmed(160).min(1, "Legal company name is required"),
  supportEmail: z
    .string()
    .trim()
    .min(1, "Support email is required")
    .max(160)
    .email("Enter a valid email"),
  emailHint: trimmed(120),
  phone: trimmed(60),
  address: trimmed(320).min(1, "Address is required"),
  officeHours: trimmed(240),
  websiteUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) =>
        !value ||
        value.startsWith("https://") ||
        value.startsWith("http://") ||
        value.startsWith("/"),
      "Website must be http(s) or a site path",
    ),
  mapsUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) =>
        !value ||
        value.startsWith("https://") ||
        value.startsWith("http://") ||
        value.startsWith("/"),
      "Maps URL must be http(s) or a site path",
    ),
  mapsSectionTitle: trimmed(80).min(1, "Maps section title is required"),
  mapsCtaLabel: trimmed(60).min(1, "Maps CTA label is required"),
  ctaLabel: trimmed(60).min(1, "Email CTA label is required"),
});

export const homepageSettingsSchema = z.object({
  hero: homepageHeroSettingsSchema,
  sportsSection: homepageSportsSectionSettingsSchema,
  footer: homepageFooterSettingsSchema,
  about: homepageAboutSettingsSchema,
  contact: homepageContactSettingsSchema,
});

export type HomepageSettingsInput = z.infer<typeof homepageSettingsSchema>;
export type HomepageHeroSettings = z.infer<typeof homepageHeroSettingsSchema>;
export type HomepageSportsSectionSettings = z.infer<
  typeof homepageSportsSectionSettingsSchema
>;
export type HomepageFooterSettings = z.infer<typeof homepageFooterSettingsSchema>;
export type HomepageAboutSettings = z.infer<typeof homepageAboutSettingsSchema>;
export type HomepageContactSettings = z.infer<typeof homepageContactSettingsSchema>;
export type HomepageFooterLink = z.infer<typeof footerLinkSchema>;
export type HomepageSocialLink = z.infer<typeof socialLinkSchema>;
