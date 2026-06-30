"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { DashboardSportSelector } from "@/components/dashboard/dashboard-sport-selector";
import type { AppRole } from "@/lib/roles/constants";
import { dashboardRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type DashboardNavProps = {
  roles: AppRole[];
  variant?: "player" | "host";
  className?: string;
};

type NavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutDashboard;
  match?: (path: string) => boolean;
};

const PLAYER_ITEMS: NavItem[] = [
  {
    href: dashboardRoutes.home,
    label: "Overview",
    mobileLabel: "Overview",
    icon: LayoutDashboard,
    match: (p) => p === dashboardRoutes.home,
  },
  {
    href: dashboardRoutes.tournaments,
    label: "Tournaments",
    mobileLabel: "Events",
    icon: Trophy,
    match: (p) =>
      p.startsWith(dashboardRoutes.tournaments) ||
      p.startsWith(dashboardRoutes.matches),
  },
  {
    href: dashboardRoutes.payments,
    label: "Payments",
    mobileLabel: "Payments",
    icon: CreditCard,
    match: (p) => p.startsWith(dashboardRoutes.payments),
  },
  {
    href: dashboardRoutes.settings,
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
    match: (p) => p.startsWith(dashboardRoutes.settings),
  },
];

const HOST_ITEMS: NavItem[] = [
  {
    href: dashboardRoutes.host,
    label: "Overview",
    mobileLabel: "Overview",
    icon: LayoutDashboard,
    match: (p) => p === dashboardRoutes.host,
  },
  {
    href: dashboardRoutes.hostTournaments,
    label: "Tournaments",
    mobileLabel: "Events",
    icon: Trophy,
    match: (p) => p.startsWith(`${dashboardRoutes.host}/tournaments`),
  },
  {
    href: dashboardRoutes.hostPayments,
    label: "Payments & payout",
    mobileLabel: "Payout",
    icon: CreditCard,
    match: (p) => p.startsWith(dashboardRoutes.hostPayments),
  },
  {
    href: dashboardRoutes.hostSettings,
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
    match: (p) => p.startsWith(dashboardRoutes.hostSettings),
  },
];

function useDashboardNavState(variant: "player" | "host") {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope");

  function isActive(item: NavItem): boolean {
    if (item.match) {
      const qs = scope ? `?scope=${scope}` : "";
      return item.match(pathname + qs);
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return { pathname, isActive };
}

/** Desktop sidebar — vertical navigation (lg+). */
export function DashboardNav({ roles, variant = "player", className }: DashboardNavProps) {
  const isHost = roles.includes("host") || roles.includes("super_admin");
  const items = variant === "host" ? HOST_ITEMS : PLAYER_ITEMS;
  const { isActive } = useDashboardNavState(variant);

  return (
    <nav
      className={cn("rounded-2xl border border-cp-border bg-cp-card/80 p-2", className)}
      aria-label={variant === "host" ? "Host navigation" : "Player navigation"}
    >
      <p className="mb-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
        {variant === "host" ? "Host workspace" : "Player workspace"}
      </p>

      <div className="mb-2 px-1">
        <DashboardSportSelector />
      </div>

      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-cp-primary/15 text-cp-primary shadow-sm"
                  : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {(variant === "player" && isHost) || variant === "host" ? (
        <div className="mt-2 border-t border-cp-border/60 pt-2">
          {variant === "player" && isHost ? (
            <Link
              href={dashboardRoutes.host}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-cp-muted transition-colors hover:bg-cp-elevated/60 hover:text-cp-primary"
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span>Switch to host</span>
            </Link>
          ) : null}
          {variant === "host" ? (
            <Link
              href={dashboardRoutes.home}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-cp-muted transition-colors hover:bg-cp-elevated/60 hover:text-emerald-300"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Switch to player</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

/** Mobile bottom tab bar — fixed while scrolling (< lg). */
export function DashboardMobileBottomNav({
  roles,
  variant = "player",
}: DashboardNavProps) {
  const isHost = roles.includes("host") || roles.includes("super_admin");
  const items = variant === "host" ? HOST_ITEMS : PLAYER_ITEMS;
  const { isActive } = useDashboardNavState(variant);

  const switchItem =
    variant === "player" && isHost
      ? {
          href: dashboardRoutes.host,
          mobileLabel: "Host",
          icon: Trophy,
          active: false,
        }
      : variant === "host"
        ? {
            href: dashboardRoutes.home,
            mobileLabel: "Player",
            icon: Users,
            active: false,
          }
        : null;

  const tabCount = items.length + (switchItem ? 1 : 0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bar = (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] box-border overflow-hidden border-t border-cp-border/80 bg-cp-bg/95 shadow-[0_-4px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl lg:hidden"
      aria-label={variant === "host" ? "Host navigation" : "Player navigation"}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div
        className="mx-auto box-border grid w-full max-w-full items-stretch gap-0 px-0 pt-0.5 sm:px-0.5 sm:pt-1"
        style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-0 px-0 py-1.5 transition-colors sm:gap-0.5 sm:py-2",
                active ? "text-cp-primary" : "text-cp-muted hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  className="absolute inset-x-1 top-0 h-0.5 rounded-full bg-cp-primary sm:inset-x-2"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8 sm:rounded-xl",
                  active ? "bg-cp-primary/15" : "bg-transparent",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" strokeWidth={active ? 2.25 : 2} />
              </span>
              <span
                className={cn(
                  "w-full max-w-full truncate px-0 text-center text-[9px] font-medium leading-tight sm:text-[10px]",
                  active && "font-semibold",
                )}
              >
                {item.mobileLabel}
              </span>
            </Link>
          );
        })}

        {switchItem ? (
          <Link
            href={switchItem.href}
            className="relative flex min-w-0 flex-col items-center justify-center gap-0 px-0 py-1.5 text-cp-muted transition-colors hover:text-foreground sm:gap-0.5 sm:py-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl">
              <switchItem.icon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
            </span>
            <span className="w-full max-w-full truncate px-0 text-center text-[9px] font-medium leading-tight sm:text-[10px]">
              {switchItem.mobileLabel}
            </span>
          </Link>
        ) : null}
      </div>
    </nav>
  );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}
