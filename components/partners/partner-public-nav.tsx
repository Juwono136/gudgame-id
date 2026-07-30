"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { authRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type PartnerPublicNavProps = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerPublicNav({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: PartnerPublicNavProps) {
  const pathname = usePathname();
  const { user, isAuthLoading } = useAuthUser();
  const [open, setOpen] = useState(false);

  const loginHref = `${authRoutes.login}?callbackUrl=${encodeURIComponent(
    partnerPublicRoutes.home(partnerSlug),
  )}`;

  const links = [
    { href: partnerPublicRoutes.tournaments(partnerSlug), label: "Tournaments" },
    { href: partnerPublicRoutes.leagues(partnerSlug), label: "Leagues" },
    { href: partnerPublicRoutes.players(partnerSlug), label: "Players" },
  ];

  const linkClass = (href: string) =>
    cn(
      "rounded-lg px-2.5 py-1.5 text-sm transition-colors",
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-cp-primary/12 font-semibold text-foreground"
        : "text-cp-muted hover:bg-cp-elevated hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-cp-border/70 bg-cp-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-cp-card/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={partnerPublicRoutes.home(partnerSlug)}
          className="flex min-w-0 items-center gap-3"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 rounded-2xl object-cover shadow-sm ring-2 ring-[color:var(--cp-primary)]/20"
            />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md"
              style={{ background: primaryColor }}
            >
              {partnerName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
            {partnerName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-0.5 border-l border-cp-border/70 pl-2">
            <ThemeToggle />
            {isAuthLoading ? (
              <span className="h-9 w-9 animate-pulse rounded-full bg-cp-elevated" />
            ) : user ? (
              <UserMenu />
            ) : (
              <Button asChild size="sm" className="ml-1 bg-cp-primary hover:bg-cp-primary-light">
                <Link href={loginHref}>Sign in</Link>
              </Button>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          {!isAuthLoading && user ? <UserMenu /> : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-cp-border"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-cp-border/60 bg-cp-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(linkClass(l.href), "px-3 py-2.5")}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {!isAuthLoading && !user ? (
              <Button asChild className="mt-2 bg-cp-primary hover:bg-cp-primary-light">
                <Link href={loginHref} onClick={() => setOpen(false)}>
                  Sign in with Gud Game
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
