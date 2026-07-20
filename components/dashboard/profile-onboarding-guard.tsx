"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionContext } from "@/hooks/use-session-context";
import { dashboardRoutes } from "@/lib/constants/routes";

type ProfileOnboardingGuardProps = {
  children: ReactNode;
};

/** Redirects first-time users to profile onboarding before using the dashboard. */
export function ProfileOnboardingGuard({ children }: ProfileOnboardingGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionCtx } = useSessionContext();

  useEffect(() => {
    if (pathname?.startsWith(dashboardRoutes.completeProfile)) return;
    if (sessionCtx?.authenticated && sessionCtx.profileComplete === false) {
      router.replace(dashboardRoutes.completeProfile);
    }
  }, [pathname, router, sessionCtx?.authenticated, sessionCtx?.profileComplete]);

  return <>{children}</>;
}
