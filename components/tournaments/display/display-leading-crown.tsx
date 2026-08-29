"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type DisplayLeadingCrownProps = {
  /** Show crown when this side is strictly ahead (not tied). */
  show?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Screen-reader label when visible. */
  label?: string;
};

const SIZE_CLASS = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5 sm:h-4 sm:w-4",
  lg: "h-4 w-4 sm:h-5 sm:w-5",
} as const;

/**
 * Venue TV accent — crown beside the leading score or winner name.
 */
export function DisplayLeadingCrown({
  show = false,
  className,
  size = "md",
  label = "Leading",
}: DisplayLeadingCrownProps) {
  if (!show) return null;

  return (
    <Crown
      className={cn(
        "shrink-0 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]",
        SIZE_CLASS[size],
        className,
      )}
      aria-label={label}
      role="img"
    />
  );
}
