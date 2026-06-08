import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
  BookOpen,
} from "lucide-react";
import { adminRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { Permission } from "@/lib/roles/permissions";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: AppRole[];
  badge?: string;
  disabled?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  {
    label: "Dashboard",
    href: adminRoutes.home,
    icon: LayoutDashboard,
  },
  {
    label: "Content Approval",
    href: adminRoutes.contentApproval,
    icon: ClipboardCheck,
    permission: "admin.content.moderate",
    badge: "Soon",
    disabled: true,
  },
  {
    label: "User Management",
    href: adminRoutes.users,
    icon: Users,
    permission: "admin.users.manage",
  },
  {
    label: "Wiki Entities",
    href: adminRoutes.wikiEntities,
    icon: BookOpen,
    permission: "admin.wiki.manage",
  },
  {
    label: "Sports",
    href: adminRoutes.sports,
    icon: Trophy,
    permission: "admin.sports.manage",
    badge: "Soon",
    disabled: true,
  },
  {
    label: "System Settings",
    href: adminRoutes.settings,
    icon: Settings,
    badge: "Soon",
    disabled: true,
  },
];

export function filterAdminNav(permissions: Set<Permission>): AdminNavItem[] {
  return adminNavItems.filter((item) => {
    if (item.permission && !permissions.has(item.permission)) return false;
    return true;
  });
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === adminRoutes.home) return pathname === adminRoutes.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}
