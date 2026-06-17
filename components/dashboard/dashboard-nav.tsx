"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  Settings,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
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
  icon: typeof LayoutDashboard;
  match?: (path: string) => boolean;
};

const PLAYER_ITEMS: NavItem[] = [
  {
    href: dashboardRoutes.home,
    label: "Overview",
    icon: LayoutDashboard,
    match: (p) => p === dashboardRoutes.home,
  },
  {
    href: dashboardRoutes.tournaments,
    label: "Tournaments",
    icon: Trophy,
    match: (p) =>
      p.startsWith(dashboardRoutes.tournaments) && !p.startsWith(dashboardRoutes.host),
  },
  {
    href: dashboardRoutes.matches,
    label: "Match log",
    icon: Swords,
    match: (p) => p.startsWith(dashboardRoutes.matches),
  },
  {
    href: dashboardRoutes.payments,
    label: "Payments",
    icon: CreditCard,
    match: (p) => p.startsWith(dashboardRoutes.payments),
  },
  {
    href: dashboardRoutes.settings,
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith(dashboardRoutes.settings),
  },
];

const HOST_ITEMS: NavItem[] = [
  {
    href: dashboardRoutes.host,
    label: "Overview",
    icon: LayoutDashboard,
    match: (p) => p === dashboardRoutes.host,
  },
  {
    href: dashboardRoutes.hostTournaments,
    label: "Tournaments",
    icon: Trophy,
    match: (p) => p.startsWith(`${dashboardRoutes.host}/tournaments`),
  },
  {
    href: dashboardRoutes.hostPayments,
    label: "Payments & payout",
    icon: CreditCard,
    match: (p) => p.startsWith(dashboardRoutes.hostPayments),
  },
  {
    href: dashboardRoutes.settings,
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith(dashboardRoutes.settings),
  },
];

export function DashboardNav({ roles, variant = "player", className }: DashboardNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope");
  const isHost = roles.includes("host") || roles.includes("super_admin");
  const items = variant === "host" ? HOST_ITEMS : PLAYER_ITEMS;

  function isActive(item: NavItem): boolean {
    if (item.match) {
      const qs = scope ? `?scope=${scope}` : "";
      return item.match(pathname + qs);
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <nav
      className={cn("rounded-2xl border border-cp-border bg-cp-card/80 p-2", className)}
      aria-label={variant === "host" ? "Host navigation" : "Player navigation"}
    >
      <p className="mb-1 hidden px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted lg:block">
        {variant === "host" ? "Host workspace" : "Player workspace"}
      </p>

      <div className="flex gap-1.5 overflow-x-auto scroll-smooth pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:shrink lg:px-3",
                "min-w-[max-content] lg:min-w-0",
                active
                  ? "bg-cp-primary/15 text-cp-primary shadow-sm"
                  : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap lg:whitespace-normal">{item.label}</span>
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
