"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Settings, Trophy, Wallet } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  PartnerMobileBottomNav,
  type PartnerMobileNavItem,
} from "@/components/partners/partner-mobile-bottom-nav";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type PartnerDashboardNavProps = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerDashboardNav({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: PartnerDashboardNavProps) {
  const pathname = usePathname();

  const links: PartnerMobileNavItem[] = [
    { href: dashboardRoutes.partner, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: dashboardRoutes.partnerTournaments, label: "Events", icon: CalendarDays },
    { href: dashboardRoutes.partnerLeagues, label: "Leagues", icon: Trophy },
    { href: dashboardRoutes.partnerPayments, label: "Pay", icon: Wallet },
    { href: dashboardRoutes.partnerSettings, label: "Settings", icon: Settings },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClass = (href: string, exact?: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive(href, exact)
        ? "bg-cp-primary/12 font-semibold text-foreground"
        : "text-cp-muted hover:bg-cp-elevated hover:text-foreground",
    );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cp-border/80 bg-cp-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-cp-card/75">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link href={dashboardRoutes.partner} className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-cp-border sm:h-9 sm:w-9"
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white sm:h-9 sm:w-9"
                  style={{ background: primaryColor }}
                >
                  {partnerName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                  {partnerName}
                </span>
                <span className="hidden text-[11px] text-cp-muted sm:block">Console</span>
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Console">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href, l.exact)}>
                <l.icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {l.label === "Pay" ? "Payments" : l.label === "Events" ? "Tournaments" : l.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden border-cp-border md:inline-flex"
            >
              <Link
                href={partnerPublicRoutes.home(partnerSlug)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open site
              </Link>
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <PartnerMobileBottomNav
        items={links}
        pathname={pathname}
        primaryColor={primaryColor}
        hideFrom="xl"
      />
    </>
  );
}
