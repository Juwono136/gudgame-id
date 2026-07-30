import { cn } from "@/lib/utils";

/**
 * Match Gud Game navbar / footer content width (`max-w-7xl` + responsive gutters)
 * so partner dashboard and public pages align with chrome on large desktops.
 */
export const partnerPageWidthClass = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/** Narrower inner column for forms (settings, create league) inside the full-width shell. */
export const partnerFormWidthClass = "mx-auto w-full max-w-xl";

export function partnerPageClass(...extra: Array<string | undefined | null | false>) {
  return cn(partnerPageWidthClass, ...extra);
}
