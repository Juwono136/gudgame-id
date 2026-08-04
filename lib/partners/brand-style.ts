import type { CSSProperties } from "react";

/**
 * CSS custom properties for partner white-label theming.
 * Sets both app tokens (`--cp-*`) and Tailwind/shadcn aliases so
 * `bg-cp-primary`, `bg-primary`, `text-cp-primary`, etc. all resolve
 * to the partner's configured hex colors (not the global teal defaults).
 */
export function partnerBrandCssVars(
  primaryColor: string,
  accentColor: string,
): CSSProperties {
  const primary = primaryColor.trim() || "#0d9488";
  const accent = accentColor.trim() || primary;

  return {
    ["--cp-primary" as string]: primary,
    ["--cp-primary-light" as string]: accent,
    ["--cp-primary-hover" as string]: accent,
    ["--cp-primary-glow" as string]: `${primary}38`,
    ["--partner-accent" as string]: accent,
    ["--primary" as string]: primary,
    ["--ring" as string]: primary,
    // Tailwind v4 @theme aliases (otherwise utilities keep :root teal)
    ["--color-cp-primary" as string]: primary,
    ["--color-cp-primary-light" as string]: accent,
    ["--color-primary" as string]: primary,
    ["--color-ring" as string]: primary,
  };
}
