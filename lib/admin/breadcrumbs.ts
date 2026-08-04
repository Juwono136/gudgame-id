import { adminRoutes } from "@/lib/constants/routes";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

const ROUTE_CRUMBS: Record<string, AdminBreadcrumbItem[]> = {
  [adminRoutes.home]: [{ label: "Dashboard" }],
  [adminRoutes.users]: [
    { label: "Dashboard", href: adminRoutes.home },
    { label: "User Management" },
  ],
  [adminRoutes.wikiEntities]: [
    { label: "Dashboard", href: adminRoutes.home },
    { label: "Wiki Entities" },
  ],
  [adminRoutes.sports]: [
    { label: "Dashboard", href: adminRoutes.home },
    { label: "Sports" },
  ],
  [adminRoutes.settings]: [
    { label: "Dashboard", href: adminRoutes.home },
    { label: "System Settings" },
  ],
  [`${adminRoutes.settings}/payments`]: [
    { label: "Dashboard", href: adminRoutes.home },
    { label: "Payment settings" },
  ],
};

/** Resolve breadcrumb trail for an admin pathname */
export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumbItem[] {
  if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname];

  const sorted = Object.keys(ROUTE_CRUMBS)
    .filter((route) => route !== adminRoutes.home && pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length);

  const base = sorted[0];
  if (base) {
    const items = [...ROUTE_CRUMBS[base]];
    const tail = pathname.slice(base.length + 1).split("/").filter(Boolean);
    if (tail.length > 0) {
      const last = tail[tail.length - 1]!;
      items.push({
        label: last
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      });
    }
    return items;
  }

  return [{ label: "Dashboard", href: adminRoutes.home }];
}
