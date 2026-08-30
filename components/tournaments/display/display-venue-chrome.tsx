"use client";

import { useEffect, useMemo, useState } from "react";
import type { TournamentDisplaySponsorBanner } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

const ROTATE_MS = 8_000;
const VISIBLE_WHEN_MANY = 4;

type DisplayVenueChromeProps = {
  banners?: TournamentDisplaySponsorBanner[];
  partnerLogoUrl?: string | null;
  partnerName?: string | null;
  className?: string;
};

/**
 * In-flow TV chrome: sponsors (left/center) + partner brand (right).
 * Replaces the old absolute partner badge that overlapped Order of Play controls.
 */
export function DisplayVenueChrome({
  banners = [],
  partnerLogoUrl,
  partnerName,
  className,
}: DisplayVenueChromeProps) {
  const list = useMemo(
    () => banners.filter((b) => Boolean(b.imageUrl)),
    [banners],
  );
  const showPartner = Boolean(partnerLogoUrl || partnerName?.trim());
  const needsRotate = list.length > VISIBLE_WHEN_MANY;
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    if (!needsRotate) return;
    const id = window.setInterval(() => {
      setWindowStart((i) => (i + VISIBLE_WHEN_MANY) % list.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [needsRotate, list.length]);

  if (!list.length && !showPartner) return null;

  const visible = needsRotate
    ? Array.from({ length: VISIBLE_WHEN_MANY }, (_, i) => list[(windowStart + i) % list.length]!)
    : list;

  return (
    <header
      className={cn(
        "relative z-20 flex shrink-0 items-center gap-3 border-b border-white/12 bg-[#050a08]/90 px-3 py-2 backdrop-blur-sm sm:gap-4 sm:px-5 sm:py-2.5",
        className,
      )}
      aria-label="Venue branding"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
        {list.length > 0 ? (
          <>
            <p className="hidden shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40 sm:block">
              Sponsors
            </p>
            <ul
              className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-6"
              aria-label="Event sponsors"
            >
              {visible.map((b) => (
                <li key={`${b.id}-${windowStart}`} className="animate-in fade-in duration-500">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.imageUrl}
                    alt={b.label?.trim() || "Sponsor"}
                    className="h-8 max-w-[7rem] object-contain sm:h-10 sm:max-w-[9rem]"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span className="sr-only">Tournament display</span>
        )}
      </div>

      {showPartner ? (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-2 py-1.5 sm:gap-2.5 sm:px-2.5 sm:py-2">
          {partnerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerLogoUrl}
              alt=""
              className="size-8 rounded-lg object-cover ring-1 ring-white/25 sm:size-9"
            />
          ) : null}
          {partnerName?.trim() ? (
            <span className="max-w-[7rem] truncate text-xs font-semibold tracking-wide text-white/90 sm:max-w-[10rem] sm:text-sm">
              {partnerName.trim()}
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
