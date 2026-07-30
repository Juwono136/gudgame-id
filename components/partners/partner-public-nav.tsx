"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const loginHref = `${authRoutes.login}?callbackUrl=${encodeURIComponent(
    partnerPublicRoutes.home(partnerSlug),
  )}`;

  const links = [
    { href: partnerPublicRoutes.home(partnerSlug), label: "Home", exact: true },
    { href: partnerPublicRoutes.tournaments(partnerSlug), label: "Tournaments" },
    { href: partnerPublicRoutes.leagues(partnerSlug), label: "Leagues" },
    { href: partnerPublicRoutes.players(partnerSlug), label: "Players" },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-cp-border/70 bg-cp-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-cp-card/75">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent 70%)` }}
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href={partnerPublicRoutes.home(partnerSlug)}
          className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-black/5 transition group-hover:ring-cp-primary/35 dark:ring-white/10 sm:h-10 sm:w-10"
            />
          ) : (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm sm:h-10 sm:w-10"
              style={{ background: primaryColor }}
            >
              {partnerName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
            {partnerName}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {links.map((l) => {
            const active = isActive(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm transition-colors xl:px-3.5",
                  active
                    ? "font-semibold text-foreground"
                    : "text-cp-muted hover:bg-cp-elevated/70 hover:text-foreground",
                )}
              >
                {l.label}
                {active ? (
                  <span
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full"
                    style={{ background: primaryColor }}
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-1 border-l border-cp-border/70 pl-2.5 lg:flex">
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

          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            {!isAuthLoading && user ? <UserMenu /> : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-cp-border"
              aria-expanded={open}
              aria-controls="partner-public-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {open ? (
        <div
          id="partner-public-menu"
          className="border-t border-cp-border/60 bg-cp-card px-3 py-3 sm:px-6 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-0.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "min-h-11 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive(l.href, l.exact)
                    ? "bg-cp-primary/10 font-semibold text-foreground"
                    : "text-cp-muted hover:bg-cp-elevated hover:text-foreground",
                )}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {!isAuthLoading && !user ? (
              <Button asChild className="mt-2 w-full bg-cp-primary hover:bg-cp-primary-light">
                <Link href={loginHref} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
