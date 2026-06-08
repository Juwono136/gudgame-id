"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { getAdminBreadcrumbs, type AdminBreadcrumbItem } from "@/lib/admin/breadcrumbs";
import { adminRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type AdminBreadcrumbsProps = {
  items?: AdminBreadcrumbItem[];
  className?: string;
};

export function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = items ?? getAdminBreadcrumbs(pathname);

  if (crumbs.length === 0) return null;

  const isAdminRoot =
    pathname === adminRoutes.home && crumbs.length === 1 && crumbs[0]?.label === "Dashboard";

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "mb-4 flex flex-wrap items-center gap-1 text-xs sm:mb-5 sm:text-sm",
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isFirst = index === 0;
          const showAsCurrent = isLast || (isAdminRoot && isFirst);

          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-cp-muted"
                  aria-hidden
                />
              ) : null}
              {crumb.href && !showAsCurrent ? (
                <Link
                  href={crumb.href}
                  className="inline-flex max-w-[10rem] items-center gap-1.5 truncate rounded-md px-1.5 py-1 font-medium text-cp-muted transition-colors hover:bg-cp-elevated/60 hover:text-foreground sm:max-w-none"
                >
                  {isFirst ? (
                    <LayoutDashboard
                      className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                      aria-hidden
                    />
                  ) : null}
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="inline-flex max-w-[12rem] items-center gap-1.5 truncate px-1.5 py-1 font-semibold text-foreground sm:max-w-none"
                  aria-current="page"
                >
                  {isFirst ? (
                    <LayoutDashboard
                      className="h-3.5 w-3.5 shrink-0 text-cp-primary sm:h-4 sm:w-4"
                      aria-hidden
                    />
                  ) : null}
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
