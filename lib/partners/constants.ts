/** Reserved top-level path segments that cannot be partner slugs. */
export const PARTNER_RESERVED_SLUGS = [
  "about",
  "admin",
  "api",
  "auth",
  "community",
  "dashboard",
  "forgot-password",
  "images",
  "login",
  "news",
  "players",
  "register",
  "search",
  "sports",
  "tournaments",
  "favicon.ico",
  "icon",
  "apple-icon",
  "manifest.webmanifest",
  "_next",
] as const;

export function normalizePartnerSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedPartnerSlug(slug: string): boolean {
  const normalized = normalizePartnerSlug(slug);
  return (PARTNER_RESERVED_SLUGS as readonly string[]).includes(normalized);
}

export function isValidPartnerSlugFormat(slug: string): boolean {
  const normalized = normalizePartnerSlug(slug);
  if (!normalized || normalized.length < 2 || normalized.length > 80) return false;
  if (isReservedPartnerSlug(normalized)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);
}

export type PartnerBranding = {
  primaryColor?: string;
  accentColor?: string;
  backgroundStyle?: string;
  /** Short line under the partner name on the landing hero. */
  tagline?: string;
  /** Longer about / welcome copy shown on the public landing. */
  about?: string;
  /** Optional hero headline override (defaults to displayName). */
  heroTitle?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  contactWebsite?: string;
};

const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function trimText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

export function parsePartnerBranding(raw: unknown): PartnerBranding {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: PartnerBranding = {};
  if (typeof obj.primaryColor === "string" && COLOR_RE.test(obj.primaryColor.trim())) {
    out.primaryColor = obj.primaryColor.trim();
  }
  if (typeof obj.accentColor === "string" && COLOR_RE.test(obj.accentColor.trim())) {
    out.accentColor = obj.accentColor.trim();
  }
  if (typeof obj.backgroundStyle === "string" && obj.backgroundStyle.trim()) {
    out.backgroundStyle = obj.backgroundStyle.trim().slice(0, 40);
  }
  const tagline = trimText(obj.tagline, 160);
  if (tagline) out.tagline = tagline;
  const about = trimText(obj.about, 2000);
  if (about) out.about = about;
  const heroTitle = trimText(obj.heroTitle, 120);
  if (heroTitle) out.heroTitle = heroTitle;
  const contactEmail = trimText(obj.contactEmail, 160);
  if (contactEmail) out.contactEmail = contactEmail;
  const contactWhatsapp = trimText(obj.contactWhatsapp, 40);
  if (contactWhatsapp) out.contactWhatsapp = contactWhatsapp;
  const contactWebsite = trimText(obj.contactWebsite, 300);
  if (contactWebsite) out.contactWebsite = contactWebsite;
  return out;
}
