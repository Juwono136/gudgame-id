"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, Menu, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu, UserMenuMobileLinks } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearchBox } from "@/components/search/global-search-box";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  authRoutes,
  isNavActive,
  mainNavItems,
} from "@/lib/constants/navigation";
import { useDashboardMobileNavActive } from "@/hooks/use-dashboard-mobile-nav-active";
import { DASHBOARD_MOBILE_BOTTOM_NAV_HEIGHT } from "@/lib/constants/dashboard-layout";
import { SITE_HEADER_HEIGHT_CSS_VAR } from "@/lib/constants/site-layout";
import { cn } from "@/lib/utils";

/** Header bar height tokens */
const HEADER_H = "h-14 sm:h-16";

export default function Navbar() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const scrollYRef = useRef(0);
  const { isAuthenticated, isAuthLoading } = useAuthUser();
  const hasBottomDashboardNav = useDashboardMobileNavActive();
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(56);

  const isAuthLoadingNav =
    hydrated && isAuthLoading && !isAuthenticated;

  const showAuthenticated = hydrated && isAuthenticated;

  const closeMobile = () => setMobileOpen(false);

  const syncHeaderMetrics = useCallback(() => {
    const header = headerRef.current;
    if (!header) return;
    const height = header.offsetHeight;
    document.documentElement.style.setProperty(SITE_HEADER_HEIGHT_CSS_VAR, `${height}px`);
    setMenuTop(height);
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!hydrated || !headerRef.current) return;
    syncHeaderMetrics();
    const header = headerRef.current;
    const observer = new ResizeObserver(() => syncHeaderMetrics());
    observer.observe(header);
    window.addEventListener("resize", syncHeaderMetrics);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderMetrics);
      document.documentElement.style.removeProperty(SITE_HEADER_HEIGHT_CSS_VAR);
    };
  }, [hydrated, syncHeaderMetrics]);

  useLayoutEffect(() => {
    if (!mobileOpen) return;
    syncHeaderMetrics();
  }, [mobileOpen, mobileSearchOpen, syncHeaderMetrics]);

  useEffect(() => {
    const root = document.documentElement;
    if (!mobileOpen) return;

    scrollYRef.current = window.scrollY;
    root.classList.add("mobile-nav-menu-open");

    return () => {
      root.classList.remove("mobile-nav-menu-open");
      window.scrollTo(0, scrollYRef.current);
    };
  }, [mobileOpen]);

  const isHomePage = pathname === "/";

  const mobileMenuMaxHeight = `calc(100dvh - ${menuTop}px - ${
    hasBottomDashboardNav
      ? `calc(${DASHBOARD_MOBILE_BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`
      : "env(safe-area-inset-bottom, 0px)"
  })`;

  if (!hydrated) return null;

  return createPortal(
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-[120] w-full border-b border-cp-border/70 bg-cp-bg/95 backdrop-blur-md"
      >
        <div
          className={cn(
            "relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:gap-4 lg:px-8",
            HEADER_H,
          )}
        >
          <BrandLogo size="sm" className="shrink-0" />

          <nav
            className={cn(
              "hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex lg:justify-start lg:gap-1 [&::-webkit-scrollbar]:hidden",
              "md:max-lg:px-1",
            )}
            aria-label="Main"
          >
            {mainNavItems.map(({ href, label, icon: Icon }) => {
              const active = isNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 transition-colors duration-200 md:text-xs lg:gap-1.5 lg:px-3 lg:text-sm",
                    active
                      ? "nav-link-active bg-cp-primary/10 text-foreground"
                      : "font-medium text-cp-muted hover:bg-cp-elevated/80 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 lg:h-4 lg:w-4", active && "text-cp-primary")} />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5 lg:gap-3">
            {!isHomePage ? (
              <div className="relative hidden w-36 xl:w-52 lg:block">
                <GlobalSearchBox variant="navbar" className="w-full" />
              </div>
            ) : null}

            <ThemeToggle />

            {!isHomePage ? (
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-cp-muted transition-colors md:hidden",
                  mobileSearchOpen
                    ? "bg-cp-primary/15 text-cp-primary"
                    : "hover:bg-cp-elevated hover:text-foreground",
                )}
                onClick={() => setMobileSearchOpen((o) => !o)}
                aria-label="Toggle search"
                aria-expanded={mobileSearchOpen}
              >
                <Search className="h-4 w-4" />
              </button>
            ) : null}

            {showAuthenticated ? (
              <NotificationBell className="inline-flex h-9 w-9 shrink-0" />
            ) : null}

            {showAuthenticated ? (
              <UserMenu className="hidden md:inline-flex" />
            ) : isAuthLoadingNav ? (
              <div
                className="hidden h-10 w-10 animate-pulse rounded-full border border-cp-border bg-cp-elevated md:block"
                aria-hidden
              />
            ) : (
              <div className="hidden items-center gap-1.5 md:flex lg:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="btn-interactive rounded-lg border-cp-border bg-transparent px-2.5 text-[10px] font-semibold tracking-wide text-foreground hover:border-cp-primary/50 hover:bg-cp-primary/10 lg:px-3 lg:text-xs"
                >
                  <Link href={authRoutes.register}>CONTRIBUTE</Link>
                </Button>

                <Button
                  size="sm"
                  asChild
                  className="btn-interactive rounded-lg bg-cp-primary px-2.5 text-[10px] font-semibold tracking-wide text-primary-foreground shadow-[0_4px_14px_rgba(0,71,255,0.35)] hover:bg-[#0033C0] lg:px-3 lg:text-xs"
                >
                  <Link href={authRoutes.login}>LOGIN</Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-cp-muted transition-colors hover:bg-cp-elevated hover:text-foreground md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0, scale: 0.85 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0, scale: 0.85 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!isHomePage && mobileSearchOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-visible border-b border-cp-border bg-cp-bg md:hidden"
            >
              <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
                <GlobalSearchBox variant="navbar" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              className="fixed inset-x-0 bottom-0 z-[115] bg-black/50 backdrop-blur-sm md:hidden"
              style={{ top: menuTop }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
            />

            <motion.div
              className="fixed inset-x-0 z-[118] border-b border-cp-border bg-cp-bg shadow-lg md:hidden"
              style={{ top: menuTop, maxHeight: mobileMenuMaxHeight }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav
                className="mx-auto max-h-[inherit] max-w-7xl overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
                aria-label="Mobile navigation"
              >
                <div className="flex flex-col gap-1">
                  {mainNavItems.map(({ href, label, icon: Icon }, i) => {
                    const active = isNavActive(pathname, href);
                    return (
                      <motion.div
                        key={href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ delay: i * 0.04, duration: 0.22 }}
                      >
                        <Link
                          href={href}
                          onClick={closeMobile}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                            active
                              ? "nav-link-active bg-cp-primary/15 text-foreground"
                              : "font-medium text-cp-muted hover:bg-cp-elevated hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {label}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {showAuthenticated ? (
                  <UserMenuMobileLinks onNavigate={closeMobile} />
                ) : isAuthLoadingNav ? null : (
                  <motion.div
                    className="mt-4 flex flex-col gap-2"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.22 }}
                  >
                    <Button
                      variant="outline"
                      asChild
                      className="btn-interactive w-full rounded-lg border-cp-border font-semibold text-foreground"
                    >
                      <Link href={authRoutes.register} onClick={closeMobile}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        CONTRIBUTE
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="btn-interactive w-full rounded-lg bg-cp-primary font-semibold text-primary-foreground hover:bg-[#0033C0]"
                    >
                      <Link href={authRoutes.login} onClick={closeMobile}>
                        <LogIn className="mr-2 h-4 w-4" />
                        LOGIN
                      </Link>
                    </Button>
                  </motion.div>
                )}
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
