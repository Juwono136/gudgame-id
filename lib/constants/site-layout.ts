/** Measured at runtime by the site header (ResizeObserver). */
export const SITE_HEADER_HEIGHT_CSS_VAR = "--site-header-height";

/** Tailwind offset class — keep as a literal string for JIT scanning. */
export const siteHeaderOffsetClass = "pt-[var(--site-header-height,3.5rem)]";
