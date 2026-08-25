"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { TournamentDisplayBrandTheme } from "@/lib/tournaments/settings";

type DisplayVenueShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Lock to one viewport height (no page scroll). */
  lockViewport?: boolean;
  /** Per-event hospitality branding for TV / scoreboard atmosphere. */
  brandTheme?: TournamentDisplayBrandTheme | null;
};

function resolveThemeColors(brandTheme?: TournamentDisplayBrandTheme | null) {
  const primary = brandTheme?.primaryColor?.trim() || "#00bf8b";
  const accent = brandTheme?.accentColor?.trim() || primary;
  return { primary, accent };
}

/** Full-screen venue backdrop — works on projectors and mobile displays. */
export const DisplayVenueShell = forwardRef<HTMLDivElement, DisplayVenueShellProps>(
  function DisplayVenueShell(
    { children, className, lockViewport, brandTheme },
    ref,
  ) {
    const { primary, accent } = resolveThemeColors(brandTheme);
    const style = brandTheme?.backgroundStyle ?? "gradient";
    const scoreboard = brandTheme?.scoreboardStyle ?? "classic";

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden bg-[#070b14] text-white",
          lockViewport ? "flex h-dvh max-h-dvh flex-col" : "min-h-dvh",
          scoreboard === "bold" && "tracking-tight",
          scoreboard === "minimal" && "font-light",
        )}
        style={
          {
            ["--display-primary" as string]: primary,
            ["--display-accent" as string]: accent,
          } as React.CSSProperties
        }
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              style === "solid"
                ? "#0a0f18"
                : style === "dark_court"
                  ? "#05070c"
                  : "#070b14",
          }}
          aria-hidden
        />
        {style !== "solid" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 120% 80% at 50% -20%, ${primary}40, transparent 55%)`,
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 60% 50% at 100% 100%, ${accent}22, transparent 50%)`,
              }}
              aria-hidden
            />
          </>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `linear-gradient(160deg, ${primary}22 0%, transparent 45%)`,
            }}
            aria-hidden
          />
        )}
        {style === "dark_court" ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
              backgroundSize: "clamp(28px, 3.5vw, 48px) clamp(28px, 3.5vw, 48px)",
            }}
            aria-hidden
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "clamp(32px, 4vw, 56px) clamp(32px, 4vw, 56px)",
            }}
            aria-hidden
          />
        )}
        <div
          className={cn(
            "relative z-[1] flex w-full min-h-0 flex-col",
            lockViewport ? "h-full flex-1" : "min-h-dvh",
            className,
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);
