import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { platformSettings } from "@/db/schema/tournament-payments";
import { brandAssets, siteConfig } from "@/lib/config/site";
import { coerceRichHtmlField, sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import {
  homepageSettingsSchema,
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

export function normalizeHomepageSettings(raw: unknown): HomepageSettings {
  const source = asRecord(raw);
  return {
    hero: mergeHero(source?.hero),
    sportsSection: mergeSportsSection(source?.sportsSection),
    footer: mergeFooter(source?.footer),
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
