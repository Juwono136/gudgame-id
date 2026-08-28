/** Main content padding so fixed partner bottom nav does not cover CTAs. */
export function partnerMobileNavContentClass(hideFrom: "lg" | "xl" = "lg"): string {
  return hideFrom === "xl" ? "pb-20 xl:pb-0" : "pb-20 lg:pb-0";
}
