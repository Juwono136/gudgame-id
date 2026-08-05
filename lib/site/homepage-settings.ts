import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { platformSettings } from "@/db/schema/tournament-payments";
import { brandAssets, siteConfig } from "@/lib/config/site";
import { coerceRichHtmlField, sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import {
  homepageSettingsSchema,
  type HomepageAboutSettings,
  type HomepageContactSettings,
  type HomepageFooterSettings,
  type HomepageHeroSettings,
  type HomepageSettingsInput,
  type HomepageSportsSectionSettings,
} from "@/lib/validations/homepage-settings";

export const PLATFORM_HOMEPAGE_SETTINGS_KEY = "homepage_content";

export type HomepageSettings = HomepageSettingsInput;

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  hero: {
    badgeText: "The Official Community Hub",
    logoUrl: brandAssets.logo,
    logoAlt: siteConfig.name,
    bannerImageUrl: "/images/bg-03.jpg",
    bannerAlt: "",
    title: "Super sports app",
    titleHighlight: "database and match maker",
    subtitle: "Player profiles, gear specs, and tournament coverage — all in one place.",
    searchPlaceholder: "Search players, gear, tournaments, news…",
  },
  sportsSection: {
    badgeText: "Choose your sport",
    title: "Sports List",
    subtitle:
      "Pick a discipline below to browse players, equipment, tournaments, and more.",
    includeLiveCount: true,
    emptyStateText: "Sports databases are being configured. Check back soon.",
  },
  footer: {
    logoUrl: brandAssets.logo,
    logoAlt: siteConfig.name,
    description:
      "<p>The leading community knowledge platform for court sports — players, tournaments, gear, and live data.</p>",
    companyName: "PT Aplikasi Wong Kito Galo",
    supportEmail: "help@gudgame.id",
    address: "Jl. Limo Raya No. 7, Limo, Kota Depok - Jawa Barat, 16515.",
    siteColumnTitle: "Site",
    siteLinks: [
      { label: "About", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Terms", href: "/terms" },
    ],
    legalColumnTitle: "Legal",
    legalLinks: [
      { label: "Privacy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
    connectColumnTitle: "Connect",
    socialLinks: [
      { platform: "instagram", label: "Instagram", href: "https://instagram.com" },
      { platform: "twitter", label: "Twitter", href: "https://twitter.com" },
    ],
    copyrightSuffix: "Performance Data Aesthetics.",
  },
  about: {
    badgeText: "Our story",
    title: "About Gud Game",
    subtitle: `Learn about ${siteConfig.name} — the modern sports encyclopedia built for court sports communities.`,
    bannerImageUrl: "/images/bg-03.jpg",
    bannerAlt: "",
    imageUrl: "",
    imageAlt: "",
    description: `<p>${siteConfig.name} is the community knowledge platform for court sports — bringing players, tournaments, gear, and live data together in one place.</p><p>We help organizers run events, give players a home for their profiles and stats, and make sport knowledge easier to discover.</p>`,
    missionTitle: "Our mission",
    missionBody:
      "Build the most trusted, modern home for court sports communities — where performance data meets great aesthetics.",
  },
  contact: {
    badgeText: "Get in touch",
    title: "Contact Us",
    subtitle: `Questions, partnerships, or support — the ${siteConfig.name} team is here to help.`,
    bannerImageUrl: "/images/bg-03.jpg",
    bannerAlt: "",
    description:
      "<p>Reach out for product support, partnership inquiries, or press. We typically respond within 1–2 business days.</p><p>This page lists the official contact channels for PT Aplikasi Wong Kito Galo, the company operating Gud Game.</p>",
    introCardTitle: "Official business contact",
    introCardSubtitle:
      "Use these channels for support, partnerships, and compliance verification.",
    legalSectionTitle: "Legal entity",
    productName: siteConfig.name,
    companyLegalName: "PT Aplikasi Wong Kito Galo",
    supportEmail: "help@gudgame.id",
    emailHint: "Primary support & business inquiries",
    phone: "",
    address: "Jl. Limo Raya No. 7, Limo, Kota Depok - Jawa Barat, 16515.",
    officeHours: "Mon–Fri, 09:00–17:00 WIB",
    websiteUrl: "https://gudgame.id",
    mapsUrl: "",
    mapsSectionTitle: "Our location",
    mapsCtaLabel: "View on Maps",
    ctaLabel: "Email support",
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(
  source: Record<string, unknown> | null,
  key: string,
  fallback: string,
  max: number,
): string {
  const raw = source?.[key];
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function pickOptionalString(
  source: Record<string, unknown> | null,
  key: string,
  fallback: string,
  max: number,
): string {
  const raw = source?.[key];
  if (typeof raw !== "string") return fallback;
  return raw.trim().slice(0, max);
}

function pickBool(
  source: Record<string, unknown> | null,
  key: string,
  fallback: boolean,
): boolean {
  const raw = source?.[key];
  return typeof raw === "boolean" ? raw : fallback;
}

function pickLinks(
  source: Record<string, unknown> | null,
  key: string,
  fallback: HomepageFooterSettings["siteLinks"],
): HomepageFooterSettings["siteLinks"] {
  const raw = source?.[key];
  if (!Array.isArray(raw)) return fallback;
  const links = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const href = typeof row.href === "string" ? row.href.trim() : "";
      if (!label || !href) return null;
      return { label: label.slice(0, 60), href: href.slice(0, 500) };
    })
    .filter((item): item is { label: string; href: string } => item != null)
    .slice(0, 12);
  return links.length > 0 ? links : fallback;
}

function pickSocialLinks(
  source: Record<string, unknown> | null,
  key: string,
  fallback: HomepageFooterSettings["socialLinks"],
): HomepageFooterSettings["socialLinks"] {
  const raw = source?.[key];
  if (!Array.isArray(raw)) return fallback;
  const allowed = new Set([
    "instagram",
    "youtube",
    "tiktok",
    "twitter",
    "facebook",
    "linkedin",
    "custom",
  ]);
  const links = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const platform =
        typeof row.platform === "string" && allowed.has(row.platform)
          ? (row.platform as HomepageFooterSettings["socialLinks"][number]["platform"])
          : "custom";
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const href = typeof row.href === "string" ? row.href.trim() : "";
      if (!label || !href) return null;
      return { platform, label: label.slice(0, 60), href: href.slice(0, 500) };
    })
    .filter(
      (
        item,
      ): item is HomepageFooterSettings["socialLinks"][number] => item != null,
    )
    .slice(0, 12);
  return links.length > 0 ? links : fallback;
}

function mergeHero(raw: unknown): HomepageHeroSettings {
  const source = asRecord(raw);
  const d = DEFAULT_HOMEPAGE_SETTINGS.hero;
  return {
    badgeText: pickString(source, "badgeText", d.badgeText, 80),
    logoUrl: pickOptionalString(source, "logoUrl", d.logoUrl, 800) || d.logoUrl,
    logoAlt: pickString(source, "logoAlt", d.logoAlt, 120),
    bannerImageUrl:
      pickOptionalString(source, "bannerImageUrl", d.bannerImageUrl, 800) ||
      d.bannerImageUrl,
    bannerAlt: pickOptionalString(source, "bannerAlt", d.bannerAlt, 200),
    title: pickString(source, "title", d.title, 120),
    titleHighlight: pickOptionalString(source, "titleHighlight", d.titleHighlight, 120),
    subtitle: pickString(source, "subtitle", d.subtitle, 600),
    searchPlaceholder: pickString(source, "searchPlaceholder", d.searchPlaceholder, 120),
  };
}

function mergeSportsSection(raw: unknown): HomepageSportsSectionSettings {
  const source = asRecord(raw);
  const d = DEFAULT_HOMEPAGE_SETTINGS.sportsSection;
  return {
    badgeText: pickString(source, "badgeText", d.badgeText, 80),
    title: pickString(source, "title", d.title, 120),
    subtitle: pickString(source, "subtitle", d.subtitle, 600),
    includeLiveCount: pickBool(source, "includeLiveCount", d.includeLiveCount),
    emptyStateText: pickString(source, "emptyStateText", d.emptyStateText, 240),
  };
}

function mergeFooter(raw: unknown): HomepageFooterSettings {
  const source = asRecord(raw);
  const d = DEFAULT_HOMEPAGE_SETTINGS.footer;
  const descriptionRaw = pickString(source, "description", d.description, 2000);
  const description =
    coerceRichHtmlField(descriptionRaw) || sanitizeRichText(d.description) || d.description;

  return {
    logoUrl: pickOptionalString(source, "logoUrl", d.logoUrl, 800) || d.logoUrl,
    logoAlt: pickString(source, "logoAlt", d.logoAlt, 120),
    description,
    companyName: pickString(source, "companyName", d.companyName, 160),
    supportEmail: pickString(source, "supportEmail", d.supportEmail, 160),
    address: pickString(source, "address", d.address, 320),
    siteColumnTitle: pickString(source, "siteColumnTitle", d.siteColumnTitle, 40),
    siteLinks: pickLinks(source, "siteLinks", d.siteLinks),
    legalColumnTitle: pickString(source, "legalColumnTitle", d.legalColumnTitle, 40),
    legalLinks: pickLinks(source, "legalLinks", d.legalLinks),
    connectColumnTitle: pickString(source, "connectColumnTitle", d.connectColumnTitle, 40),
    socialLinks: pickSocialLinks(source, "socialLinks", d.socialLinks),
    copyrightSuffix: pickString(source, "copyrightSuffix", d.copyrightSuffix, 160),
  };
}

function mergeAbout(raw: unknown): HomepageAboutSettings {
  const source = asRecord(raw);
  const d = DEFAULT_HOMEPAGE_SETTINGS.about;
  const descriptionRaw = pickString(source, "description", d.description, 20000);
  const description =
    coerceRichHtmlField(descriptionRaw) || sanitizeRichText(d.description) || d.description;

  return {
    badgeText: pickString(source, "badgeText", d.badgeText, 80),
    title: pickString(source, "title", d.title, 120),
    subtitle: pickString(source, "subtitle", d.subtitle, 400),
    bannerImageUrl:
      pickOptionalString(source, "bannerImageUrl", d.bannerImageUrl, 800) || d.bannerImageUrl,
    bannerAlt: pickOptionalString(source, "bannerAlt", d.bannerAlt, 200),
    imageUrl: pickOptionalString(source, "imageUrl", d.imageUrl, 800),
    imageAlt: pickOptionalString(source, "imageAlt", d.imageAlt, 200),
    description,
    missionTitle: pickString(source, "missionTitle", d.missionTitle, 120),
    missionBody: pickString(source, "missionBody", d.missionBody, 1200),
  };
}

function mergeContact(raw: unknown): HomepageContactSettings {
  const source = asRecord(raw);
  const d = DEFAULT_HOMEPAGE_SETTINGS.contact;
  const descriptionRaw = pickString(source, "description", d.description, 4000);
  const description =
    coerceRichHtmlField(descriptionRaw) || sanitizeRichText(d.description) || d.description;

  return {
    badgeText: pickString(source, "badgeText", d.badgeText, 80),
    title: pickString(source, "title", d.title, 120),
    subtitle: pickString(source, "subtitle", d.subtitle, 400),
    bannerImageUrl:
      pickOptionalString(source, "bannerImageUrl", d.bannerImageUrl, 800) || d.bannerImageUrl,
    bannerAlt: pickOptionalString(source, "bannerAlt", d.bannerAlt, 200),
    description,
    introCardTitle: pickString(source, "introCardTitle", d.introCardTitle, 80),
    introCardSubtitle: pickString(source, "introCardSubtitle", d.introCardSubtitle, 240),
    legalSectionTitle: pickString(source, "legalSectionTitle", d.legalSectionTitle, 80),
    productName: pickString(source, "productName", d.productName, 80),
    companyLegalName: pickString(source, "companyLegalName", d.companyLegalName, 160),
    supportEmail: pickString(source, "supportEmail", d.supportEmail, 160),
    emailHint: pickOptionalString(source, "emailHint", d.emailHint, 120),
    phone: pickOptionalString(source, "phone", d.phone, 60),
    address: pickString(source, "address", d.address, 320),
    officeHours: pickOptionalString(source, "officeHours", d.officeHours, 240),
    websiteUrl: pickOptionalString(source, "websiteUrl", d.websiteUrl, 500),
    mapsUrl: pickOptionalString(source, "mapsUrl", d.mapsUrl, 500),
    mapsSectionTitle: pickString(source, "mapsSectionTitle", d.mapsSectionTitle, 80),
    mapsCtaLabel: pickString(source, "mapsCtaLabel", d.mapsCtaLabel, 60),
    ctaLabel: pickString(source, "ctaLabel", d.ctaLabel, 60),
  };
}

export function normalizeHomepageSettings(raw: unknown): HomepageSettings {
  const source = asRecord(raw);
  return {
    hero: mergeHero(source?.hero),
    sportsSection: mergeSportsSection(source?.sportsSection),
    footer: mergeFooter(source?.footer),
    about: mergeAbout(source?.about),
    contact: mergeContact(source?.contact),
  };
}

function sanitizeForPersist(input: HomepageSettings): HomepageSettings {
  const parsed = homepageSettingsSchema.parse(input);
  return {
    ...parsed,
    footer: {
      ...parsed.footer,
      description:
        coerceRichHtmlField(parsed.footer.description) ||
        sanitizeRichText(parsed.footer.description) ||
        parsed.footer.description,
    },
    about: {
      ...parsed.about,
      description:
        coerceRichHtmlField(parsed.about.description) ||
        sanitizeRichText(parsed.about.description) ||
        parsed.about.description,
    },
    contact: {
      ...parsed.contact,
      description:
        coerceRichHtmlField(parsed.contact.description) ||
        sanitizeRichText(parsed.contact.description) ||
        parsed.contact.description,
    },
  };
}

export const getHomepageSettings = cache(async (): Promise<HomepageSettings> => {
  const [row] = await getDb()
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, PLATFORM_HOMEPAGE_SETTINGS_KEY))
    .limit(1);

  if (!row?.value) return DEFAULT_HOMEPAGE_SETTINGS;
  return normalizeHomepageSettings(row.value);
});

export async function updateHomepageSettings(
  value: HomepageSettings,
  updatedBy: string,
): Promise<HomepageSettings> {
  const sanitized = sanitizeForPersist(value);

  await getDb()
    .insert(platformSettings)
    .values({
      key: PLATFORM_HOMEPAGE_SETTINGS_KEY,
      value: sanitized,
      updatedBy,
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: sanitized, updatedBy, updatedAt: new Date() },
    });

  return sanitized;
}
