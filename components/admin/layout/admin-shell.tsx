"use client";

import { useMemo, useState } from "react";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";
import { AdminMobileDrawer } from "./admin-mobile-drawer";
import { AdminNavbar } from "./admin-navbar";
import { AdminSidebar } from "./admin-sidebar";
import type { AdminBreadcrumbItem } from "@/lib/admin/breadcrumbs";
import type { AdminSessionContext } from "@/lib/admin/types";
import { AdminSportProvider, useAdminSport } from "@/providers/admin-sport-provider";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  context: AdminSessionContext;
  title: string;
  children: React.ReactNode;
  className?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
};

export function AdminShell({
  context,
  title,
  children,
  className,
  breadcrumbs,
}: AdminShellProps) {
  return (
    <AdminSportProvider initialSportSlug={context.sportSlug}>
      <AdminShellInner
        context={context}
        title={title}
        className={className}
        breadcrumbs={breadcrumbs}
      >
        {children}
      </AdminShellInner>
    </AdminSportProvider>
  );
}

function AdminShellInner({
  context,
  title,
  children,
  className,
  breadcrumbs,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { sportSlug } = useAdminSport();
  const liveContext = useMemo(
    () => ({ ...context, sportSlug }),
    [context, sportSlug],
  );

  return (
    <div className="min-h-screen bg-cp-bg">
      <div className="lg:flex">
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <AdminSidebar context={liveContext} />
        </div>

        <AdminMobileDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          context={liveContext}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <AdminNavbar
            context={liveContext}
            title={title}
            onMenuOpen={() => setMobileOpen(true)}
          />
          <main className={cn("flex-1 px-4 py-5 sm:px-6 lg:px-8", className)}>
            <AdminBreadcrumbs items={breadcrumbs} />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
