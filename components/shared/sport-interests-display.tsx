"use client";

import type { SportInterestItem } from "@/lib/account/player-performance/sport-interests";
import { cn } from "@/lib/utils";

type SportInterestsDisplayProps = {
  items: SportInterestItem[];
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

export function SportInterestsDisplay({
  items,
  title = "Sports followed",
  description,
  compact = false,
  className,
}: SportInterestsDisplayProps) {
  if (!items.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {!compact ? (
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-cp-muted">{description}</p>
          ) : null}
        </div>
      ) : null}
      <ul className="flex flex-wrap gap-1.5 sm:gap-2">
        {items.map((sport) => (
          <li
            key={sport.slug}
            className={cn(
              "rounded-full border border-cp-primary/25 bg-cp-primary/10 font-medium text-cp-primary",
              compact ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs sm:text-sm",
            )}
          >
            {sport.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
