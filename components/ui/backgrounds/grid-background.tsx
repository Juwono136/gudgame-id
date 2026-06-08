"use client";

import { cn } from "@/lib/utils";

type GridBackgroundProps = {
  className?: string;
};

/**
 * Aceternity grid-only background — sporty court-line feel.
 * @see https://ui.aceternity.com/components/grid-and-dot-backgrounds
 */
export function GridBackground({ className }: GridBackgroundProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-cp-bg",
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,71,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,71,255,0.14)_1px,transparent_1px)] bg-size-[48px_48px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_20%,transparent_70%)]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(0,71,255,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-cp-bg/90" />
    </div>
  );
}
