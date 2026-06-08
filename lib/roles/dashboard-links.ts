import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, LayoutDashboard, Shield } from "lucide-react";
import { adminRoutes, dashboardRoutes } from "@/lib/constants/routes";
import { canAccessContributorDashboard } from "@/lib/roles/route-access";
import type { AppRole } from "@/lib/roles/constants";
import { getRoleLabel } from "@/lib/roles/constants";
import { getPermissionsForRoles } from "@/lib/roles/permissions";

export type RoleDashboardLink = {
  role: AppRole;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

const DASHBOARD_BY_ROLE: Record<AppRole, RoleDashboardLink | null> = {
  player: {
    role: "player",
    label: "Player Dashboard",
    href: dashboardRoutes.home,
    icon: LayoutDashboard,
    description: "Your profile, clubs, and tournaments",
  },
  contributor: {
    role: "contributor",
    label: "Contributor Dashboard",
    href: dashboardRoutes.contributor,
    icon: ClipboardCheck,
    description: "Edit wiki content on the public site",
  },
  super_admin: {
    role: "super_admin",
    label: "Admin Console",
    href: adminRoutes.home,
    icon: Shield,
    description: "Full platform administration",
  },
};

/** Dashboard entry points shown in profile menu — one link per role held */
export function getDashboardLinksForRoles(roles: AppRole[]): RoleDashboardLink[] {
  const seen = new Set<string>();
  const links: RoleDashboardLink[] = [];

  const order: AppRole[] = ["super_admin", "contributor", "player"];
  for (const role of order) {
    if (!roles.includes(role)) continue;
    if (role === "contributor" && !canAccessContributorDashboard(roles)) {
      continue;
    }
    const link = DASHBOARD_BY_ROLE[role];
    if (!link || seen.has(link.href)) continue;
    seen.add(link.href);
    links.push(link);
  }

  return links;
}

export function getRoleBadgeLabels(roles: AppRole[]): string[] {
  return roles.map((r) => getRoleLabel(r));
}

export function userCanAccessAdmin(roles: AppRole[]): boolean {
  return roles.includes("super_admin");
}
