"use client";

import { useEffect, useMemo, useState } from "react";
import type { TournamentDisplaySponsorBanner } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

const ROTATE_MS = 8_000;
const VISIBLE_WHEN_MANY = 4;

type DisplaySponsorStripProps = {
  banners: TournamentDisplaySponsorBanner[];
  className?: string;
};

/**
 * In-flow venue-TV sponsor header — placed at the top for visibility on monitors.
 */
export function DisplaySponsorStrip({ banners, className }: DisplaySponsorStripProps) {
  const list = useMemo(
    () => banners.filter((b) => Boolean(b.imageUrl)),
    [banners],
  );
  const needsRotate = list.length > VISIBLE_WHEN_MANY;
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    if (!needsRotate) return;
    const id = window.setInterval(() => {
      setWindowStart((i) => (i + VISIBLE_WHEN_MANY) % list.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [needsRotate, list.length]);

  if (!list.length) return null;

  const visible = needsRotate
    ? Array.from({ length: VISIBLE_WHEN_MANY }, (_, i) => list[(windowStart + i) % list.length]!)
    : list;

  return (
    <header
      className={cn(
        "relative z-20 shrink-0 border-b border-white/12 bg-[#050a08] px-3 py-2.5 sm:px-5 sm:py-3",
        className,
      )}
      aria-label="Event sponsors"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 sm:gap-8">
        <p className="hidden shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40 sm:block">
          Sponsors
        </p>
        <ul className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-4 sm:gap-8">
          {visible.map((b) => (
            <li key={`${b.id}-${windowStart}`} className="animate-in fade-in duration-500">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.imageUrl}
                alt={b.label?.trim() || "Sponsor"}
                className="h-9 max-w-[8rem] object-contain sm:h-11 sm:max-w-[10rem]"
              />
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
