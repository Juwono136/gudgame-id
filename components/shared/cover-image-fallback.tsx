"use client";

import type { LucideIcon } from "lucide-react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type CoverImageFallbackProps = {
  /** `card` = discovery cover plane; `thumb` = list/row thumbnail. */
  size?: "card" | "thumb";
  icon?: LucideIcon;
  className?: string;
};

/**
 * Branded placeholder when a tournament/league has no cover or brand image.
 * Avoids empty grey/gradient-only surfaces on partner listings.
 */
export function CoverImageFallback({
  size = "card",
  icon: Icon = Trophy,
  className,
}: CoverImageFallbackProps) {
  const isThumb = size === "thumb";

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-cp-primary/22 via-cp-elevated to-cp-card",
        className,
      )}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--cp-primary, #0d9488) 55%, transparent) 1px, transparent 0)",
          backgroundSize: isThumb ? "10px 10px" : "16px 16px",
        }}
      />
      <span
        className={cn(
          "relative z-[1] flex items-center justify-center rounded-2xl border border-cp-border/70 bg-cp-card/85 text-cp-primary shadow-sm backdrop-blur-[2px]",
          isThumb ? "h-9 w-9 rounded-xl sm:h-10 sm:w-10" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
        )}
      >
        <Icon
          className={cn(isThumb ? "h-4 w-4 sm:h-5 sm:w-5" : "h-8 w-8 sm:h-9 sm:w-9")}
          strokeWidth={1.75}
        />
      </span>
    </div>
  );
}
