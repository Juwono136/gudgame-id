/** Centralized app metadata — safe for client and server. */
export const siteConfig = {
  name: "TandingBase",
  shortName: "TandingBase",
  description:
    "Modern sports encyclopedia — tournaments, live scores, player tiers, wiki, and community for court sports.",
  defaultLocale: "en",
  defaultSportSlug: "padel",
} as const;

/** Brand images — single source for UI, metadata, and PWA. */
export const brandAssets = {
  logo: "/images/icon-logo.png",
  logo512: "/images/icon-logo-512.png",
  favicon: "/favicon.ico",
} as const;
