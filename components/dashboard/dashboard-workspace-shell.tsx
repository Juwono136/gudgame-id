"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { AppRole } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";

export type DashboardBreadcrumb = {
  label: string;
  href?: string;
};

type DashboardWorkspaceShellProps = {
  roles: AppRole[];
  variant: "player" | "host";
  title: string;
  description?: string;
  breadcrumbs?: DashboardBreadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardWorkspaceShell({
  roles,
  variant,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: DashboardWorkspaceShellProps) {
  return (
    <div className={cn("min-h-[calc(100dvh-4rem)] overflow-x-clip bg-cp-bg", className)}>
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:py-10">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex flex-wrap items-center gap-1 text-xs text-cp-muted"
          >
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-cp-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden w-60 shrink-0 lg:block xl:w-64">
            <div className="sticky top-24">
              <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-cp-card/50" />}>
                <DashboardNav roles={roles} variant={variant} />
              </Suspense>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <header className="mb-6 space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-cp-primary">
                    {variant === "host" ? "Host workspace" : "Player workspace"}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cp-muted">
                      {description}
                    </p>
                  ) : null}
                </div>
                {actions ? (
                  <div className="flex w-full shrink-0 flex-col gap-2 md:ml-auto md:w-auto md:items-end [&_a]:w-full [&_button]:w-full md:[&_a]:w-auto md:[&_button]:w-auto">
                    {actions}
                  </div>
                ) : null}
              </div>
            </header>

            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
