import { stripHtmlTags } from "@/lib/html/strip-html";
import {
  isValidPartnerSlugFormat,
  normalizePartnerSlug,
  type PartnerBranding,
} from "@/lib/partners/constants";
import {
  coerceRichHtmlField,
  hasRichTextContent,
  sanitizeRichText,
} from "@/lib/wiki/sanitize-rich-text";

export const PARTNER_BRANDING_LIMITS = {
  displayNameMin: 2,
  displayName: 120,
  slugMin: 2,
  slug: 80,
  heroTitle: 120,
  tagline: 160,
  /** Plain-text length for About (HTML tags do not count). */
  aboutPlain: 2000,
  /** Hard cap on stored HTML size. */
  aboutHtml: 12_000,
  contactEmail: 160,
  contactWhatsapp: 40,
  contactWebsite: 300,
} as const;

const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{5,38}$/;

export type PartnerBrandingFormValues = {
  displayName: string;
  slug: string;
  primaryColor: string;
  accentColor: string;
  heroTitle: string;
  tagline: string;
  about: string;
  contactEmail: string;
  contactWhatsapp: string;
  contactWebsite: string;
};

export type PartnerBrandingFieldErrors = Partial<
  Record<keyof PartnerBrandingFormValues, string>
>;

export function normalizeBrandHex(raw: string, fallback = "#0d9488"): string {
  const trimmed = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, a, b, c] = trimmed;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

export function isValidBrandHex(raw: string): boolean {
  return COLOR_RE.test(raw.trim());
}

export function aboutPlainLength(html: string): number {
  return stripHtmlTags(html).length;
}

function normalizeWebsite(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function isValidWebsite(raw: string): boolean {
  try {
    const url = new URL(normalizeWebsite(raw));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Client + API field validation before persist. */
export function validatePartnerBrandingForm(
  values: PartnerBrandingFormValues,
): PartnerBrandingFieldErrors {
  const errors: PartnerBrandingFieldErrors = {};
  const name = values.displayName.trim();
  if (name.length < PARTNER_BRANDING_LIMITS.displayNameMin) {
    errors.displayName = `Display name must be at least ${PARTNER_BRANDING_LIMITS.displayNameMin} characters.`;
  } else if (name.length > PARTNER_BRANDING_LIMITS.displayName) {
    errors.displayName = `Display name must be ${PARTNER_BRANDING_LIMITS.displayName} characters or fewer.`;
  }

  const slug = normalizePartnerSlug(values.slug);
  if (!isValidPartnerSlugFormat(slug)) {
    errors.slug =
      "Use 2–80 characters: lowercase letters, numbers, and hyphens (not reserved).";
  }

  if (!isValidBrandHex(values.primaryColor)) {
    errors.primaryColor = "Enter a valid hex color (e.g. #0d9488).";
  }
  if (!isValidBrandHex(values.accentColor)) {
    errors.accentColor = "Enter a valid hex color (e.g. #14b8a6).";
  }

  if (values.heroTitle.trim().length > PARTNER_BRANDING_LIMITS.heroTitle) {
    errors.heroTitle = `Hero title must be ${PARTNER_BRANDING_LIMITS.heroTitle} characters or fewer.`;
  }
  if (values.tagline.trim().length > PARTNER_BRANDING_LIMITS.tagline) {
    errors.tagline = `Tagline must be ${PARTNER_BRANDING_LIMITS.tagline} characters or fewer.`;
  }

  const aboutPlain = aboutPlainLength(values.about);
  if (aboutPlain > PARTNER_BRANDING_LIMITS.aboutPlain) {
    errors.about = `About must be ${PARTNER_BRANDING_LIMITS.aboutPlain.toLocaleString()} characters or fewer.`;
  } else if (values.about.length > PARTNER_BRANDING_LIMITS.aboutHtml) {
    errors.about = "About content is too large. Shorten formatting or text.";
  }

  const email = values.contactEmail.trim();
  if (email) {
    if (email.length > PARTNER_BRANDING_LIMITS.contactEmail) {
      errors.contactEmail = `Email must be ${PARTNER_BRANDING_LIMITS.contactEmail} characters or fewer.`;
    } else if (!EMAIL_RE.test(email)) {
      errors.contactEmail = "Enter a valid email address.";
    }
  }

  const phone = values.contactWhatsapp.trim();
  if (phone) {
    if (phone.length > PARTNER_BRANDING_LIMITS.contactWhatsapp) {
      errors.contactWhatsapp = `Phone must be ${PARTNER_BRANDING_LIMITS.contactWhatsapp} characters or fewer.`;
    } else if (!PHONE_RE.test(phone)) {
      errors.contactWhatsapp = "Enter a valid phone or WhatsApp number.";
    }
  }

  const website = values.contactWebsite.trim();
  if (website) {
    if (website.length > PARTNER_BRANDING_LIMITS.contactWebsite) {
      errors.contactWebsite = `Website must be ${PARTNER_BRANDING_LIMITS.contactWebsite} characters or fewer.`;
    } else if (!isValidWebsite(website)) {
      errors.contactWebsite = "Enter a valid URL (https://…).";
    }
  }

  return errors;
}

export function hasPartnerBrandingErrors(errors: PartnerBrandingFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Normalize + sanitize payload for PATCH /api/partner/me. */
export function buildPartnerBrandingPatch(values: PartnerBrandingFormValues): {
  displayName: string;
  slug: string;
  primaryColor: string;
  accentColor: string;
  tagline: string | null;
  about: string | null;
  heroTitle: string | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  contactWebsite: string | null;
} {
  const aboutHtml = hasRichTextContent(values.about)
    ? sanitizeRichText(values.about)
    : "";

  return {
    displayName: values.displayName.trim(),
    slug: normalizePartnerSlug(values.slug),
    primaryColor: normalizeBrandHex(values.primaryColor),
    accentColor: normalizeBrandHex(values.accentColor, "#14b8a6"),
    tagline: values.tagline.trim() || null,
    about: aboutHtml || null,
    heroTitle: values.heroTitle.trim() || null,
    contactEmail: values.contactEmail.trim() || null,
    contactWhatsapp: values.contactWhatsapp.trim() || null,
    contactWebsite: values.contactWebsite.trim()
      ? normalizeWebsite(values.contactWebsite)
      : null,
  };
}

/** Persist-safe branding object (sanitized about). */
export function sanitizePartnerBrandingInput(
  branding: PartnerBranding,
): PartnerBranding {
  const about =
    branding.about != null
      ? coerceRichHtmlField(branding.about) ?? undefined
      : undefined;

  let aboutSafe = about;
  if (aboutSafe && aboutPlainLength(aboutSafe) > PARTNER_BRANDING_LIMITS.aboutPlain) {
    aboutSafe = undefined;
  }

  return {
    ...branding,
    primaryColor: branding.primaryColor
      ? normalizeBrandHex(branding.primaryColor)
      : undefined,
    accentColor: branding.accentColor
      ? normalizeBrandHex(branding.accentColor, "#14b8a6")
      : undefined,
    about: aboutSafe,
  };
}

