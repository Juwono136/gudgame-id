/** Centralized app metadata — safe for client and server. */
export const siteConfig = {
  name: "Gud Game",
  shortName: "Gud Game",
  description:
    "Your home for court sports — tournaments, live scores, player profiles, wiki, and community.",
  defaultLocale: "en",
  defaultSportSlug: "padel",
} as const;

/** Brand images — single source for UI, metadata, and PWA. */
export const brandAssets = {
  logo: "/images/logo-gud-game.png",
  logo512: "/images/logo-gud-game.png",
  favicon: "/favicon.ico",
} as const;

/** Shared brand palette for inline styles (emails, charts). */
export const brandColors = {
  black: "#000000",
  forest: "#032921",
  forestAlt: "#042822",
  emerald: "#0a9e76",
  mint: "#a8dcc4",
  emeraldHover: "#088f6a",
} as const;
