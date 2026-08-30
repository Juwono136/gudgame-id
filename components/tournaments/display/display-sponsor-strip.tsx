"use client";

import { DisplayVenueChrome } from "@/components/tournaments/display/display-venue-chrome";
import type { TournamentDisplaySponsorBanner } from "@/lib/tournaments/settings";

type DisplaySponsorStripProps = {
  banners: TournamentDisplaySponsorBanner[];
  className?: string;
};

/**
 * @deprecated Prefer {@link DisplayVenueChrome} (sponsors + partner brand in-flow).
 * Kept for callers that only pass sponsor banners.
 */
export function DisplaySponsorStrip({ banners, className }: DisplaySponsorStripProps) {
  return <DisplayVenueChrome banners={banners} className={className} />;
}
