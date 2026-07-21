"use client";

import { cn } from "@/lib/utils";

type DisplayVenueShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Lock to one viewport height (no page scroll) — multi-court display grid. */
  lockViewport?: boolean;
};

/** Full-screen venue backdrop — works on projectors and mobile displays. */
export function DisplayVenueShell({ children, className, lockViewport }: DisplayVenueShellProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden text-white",
        lockViewport ? "h-dvh max-h-dvh" : "min-h-dvh",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#070b14]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(0,191,139,0.35),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(16,185,129,0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "clamp(32px, 4vw, 56px) clamp(32px, 4vw, 56px)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-[1] w-full",
          lockViewport ? "h-full min-h-0" : "min-h-dvh",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
