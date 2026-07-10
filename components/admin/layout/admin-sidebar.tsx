"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { adminRoutes } from "@/lib/constants/routes";
import { filterAdminNav, isAdminNavActive } from "@/lib/admin/navigation";
import type { AdminSessionContext } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { AdminSportSelector } from "./admin-sport-selector";
import { AdminSidebarFooter } from "./admin-sidebar-footer";

type AdminSidebarProps = {
  context: AdminSessionContext;
  onNavigate?: () => void;
  embedded?: boolean;
  onClose?: () => void;
};

export function AdminSidebar({
  context,
  onNavigate,
  embedded = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const items = filterAdminNav(context.permissions);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-cp-sidebar",
        !embedded && "border-r border-cp-border lg:w-64",
      )}
    >
      {/* Top bar: logo + close (mobile) */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cp-border px-4 py-4">
        <div className="min-w-0 flex-1">
          <BrandLogo size="sm" href="/admin" />
          {!embedded ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cp-muted">
              Master Console
            </p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-elevated hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-cp-border px-4 py-4">
        <AdminSportSelector preferNative={embedded} />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          const Icon = item.icon;
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-cp-elevated px-2 py-0.5 text-[9px] font-semibold uppercase text-cp-muted">
                  {item.badge}
                </span>
              ) : null}
            </>
          );

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cp-muted/60"
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-cp-primary/15 text-foreground shadow-sm"
                  : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
              )}
            >
              {active ? (
                <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-cp-primary" />
              ) : null}
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-cp-border p-4">
        <Link
          href={adminRoutes.wikiEntitiesNew}
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cp-primary/40 bg-cp-primary/10 px-4 py-2.5 text-sm font-semibold text-cp-logo-accent transition-colors hover:bg-cp-primary/20"
        >
          <Plus className="h-4 w-4" />
          Create New Entity
        </Link>
      </div>

      <AdminSidebarFooter />
    </aside>
  );
}
