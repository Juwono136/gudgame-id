"use client";

import { usePathname } from "next/navigation";
import { WorkspaceRoleSwitcher } from "@/components/dashboard/workspace-role-switcher";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { canShowHostWorkspaceSwitcher } from "@/lib/roles/workspace-ui";

type DashboardSportLayoutClientProps = {
  children: React.ReactNode;
  roles: AppRole[];
};

/** Dashboard layout wrapper — persistent mobile role switcher + sport context. */
export function DashboardSportLayoutClient({
  children,
  roles,
}: DashboardSportLayoutClientProps) {
  const pathname = usePathname();
  const hideRoleSwitcher =
    pathname?.startsWith(dashboardRoutes.completeProfile) ||
    !canShowHostWorkspaceSwitcher(roles);
  const variant: "player" | "host" = pathname?.startsWith("/dashboard/host") ? "host" : "player";

  return (
    <>
      {!hideRoleSwitcher ? (
        <div className="sticky top-[var(--site-header-height,3.5rem)] z-30 border-b border-cp-border/60 bg-cp-bg/95 px-4 py-2 backdrop-blur-md lg:hidden dark:bg-cp-bg/90">
          <div className="mx-auto max-w-7xl">
            <WorkspaceRoleSwitcher roles={roles} variant={variant} />
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
