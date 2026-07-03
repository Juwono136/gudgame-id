"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dashboardRoutes } from "@/lib/constants/routes";

type ProfileOnboardingGuardProps = {
  children: ReactNode;
};

/** Redirects first-time users to profile onboarding before using the dashboard. */
export function ProfileOnboardingGuard({ children }: ProfileOnboardingGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname?.startsWith(dashboardRoutes.completeProfile)) return;

    let cancelled = false;

    void fetch("/api/account/session-context", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { data?: { authenticated?: boolean; profileComplete?: boolean } }) => {
        if (cancelled) return;
        if (json.data?.authenticated && json.data.profileComplete === false) {
          router.replace(dashboardRoutes.completeProfile);
        }
      })
      .catch(() => {
        /* Non-blocking — page content still renders if context fetch fails */
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
