"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DashboardMobileBottomNav } from "@/components/dashboard/dashboard-nav";
import { setDashboardMobileNavActive } from "@/hooks/use-dashboard-mobile-nav-active";
import { useSessionContext } from "@/hooks/use-session-context";
import { useSession } from "@/lib/auth/client";
import { dashboardMobileBottomNavPaddingClass } from "@/lib/constants/dashboard-layout";
import { resolveDashboardMobileNavVariant } from "@/lib/dashboard/mobile-nav-variant";
import { cn } from "@/lib/utils";

type DashboardLayoutClientProps = {
  children: React.ReactNode;
};

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const { data: session, isPending: sessionPending } = useSession();
  const hasAuthSession = Boolean(session?.user);
  // Skip session-context for guests once Better Auth resolves — major public-page win.
  const { data: sessionCtx } = useSessionContext(sessionPending || hasAuthSession);

  const roles = sessionCtx?.roles ?? [];
  const variant = resolveDashboardMobileNavVariant(pathname, roles);
  const showMobileNav = sessionCtx?.authenticated === true && roles.length > 0;

  useEffect(() => {
    if (!showMobileNav) {
      setDashboardMobileNavActive(false);
      return;
    }
    setDashboardMobileNavActive(true);
    return () => setDashboardMobileNavActive(false);
  }, [showMobileNav]);

  return (
    <div
      className={cn(
        "min-w-0",
        showMobileNav ? dashboardMobileBottomNavPaddingClass : null,
      )}
    >
      {children}
      {showMobileNav ? (
        <Suspense fallback={null}>
          <DashboardMobileBottomNav roles={roles} variant={variant} />
        </Suspense>
      ) : null}
    </div>
  );
}
