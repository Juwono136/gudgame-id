"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PartnerMobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type PartnerMobileBottomNavProps = {
  items: readonly PartnerMobileNavItem[];
  pathname: string;
  primaryColor: string;
  /** Tailwind breakpoint prefix where bottom nav hides (default `lg`). */
  hideFrom?: "lg" | "xl";
  className?: string;
};

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile-first primary navigation — fixed to the bottom with safe-area padding.
 * Desktop nav remains in the header; this bar is hidden from `hideFrom` breakpoint up.
 */
export function PartnerMobileBottomNav({
  items,
  pathname,
  primaryColor,
  hideFrom = "lg",
  className,
}: PartnerMobileBottomNavProps) {
  const hideClass = hideFrom === "xl" ? "xl:hidden" : "lg:hidden";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-cp-border/80 bg-cp-card/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-cp-card/88 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
        hideClass,
        className,
      )}
      aria-label="Mobile navigation"
    >
      <div
        className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        style={{ ["--partner-nav-accent" as string]: primaryColor }}
      >
        {items.map((item) => {
          const active = isNavActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors sm:text-[11px]",
                active
                  ? "text-foreground"
                  : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active ? (
                <span
                  className="absolute inset-x-2 top-0 h-0.5 rounded-full"
                  style={{ background: primaryColor }}
                  aria-hidden
                />
              ) : null}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform",
                  active && "scale-105",
                )}
                style={active ? { color: primaryColor } : undefined}
                aria-hidden
              />
              <span className="max-w-full truncate leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}