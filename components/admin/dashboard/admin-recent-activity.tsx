"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, UserPlus } from "lucide-react";
import type { AdminDashboardStats } from "@/lib/admin/dashboard/service";
import { adminRoutes } from "@/lib/constants/routes";
import { Badge } from "@/components/ui/badge";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type AdminRecentActivityProps = {
  data: AdminDashboardStats;
  showUsers: boolean;
  showWiki: boolean;
};

export function AdminRecentActivity({
  data,
  showUsers,
  showWiki,
}: AdminRecentActivityProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      {showUsers ? (
        <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-cp-border/70 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Recent sign-ups</h3>
              <p className="text-xs text-cp-muted">Latest registered accounts</p>
            </div>
            <Link
              href={adminRoutes.users}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cp-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>
          <ul className="divide-y divide-cp-border/60">
            {data.recentUsers.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-cp-muted sm:px-5">
                No users yet
              </li>
            ) : (
              data.recentUsers.slice(0, 6).map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cp-primary/10 text-cp-primary">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-xs text-cp-muted">{u.email}</p>
                  </div>
                  <time className="shrink-0 text-[10px] tabular-nums text-cp-text-dim">
                    {formatWhen(u.createdAt)}
                  </time>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {showWiki ? (
        <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-cp-border/70 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Recent wiki</h3>
              <p className="truncate text-xs capitalize text-cp-muted">
                Latest for {data.sportSlug}
              </p>
            </div>
            <Link
              href={adminRoutes.wikiEntities}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cp-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>
          <ul className="divide-y divide-cp-border/60">
            {data.recentWiki.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-cp-muted sm:px-5">
                No wiki entities yet
              </li>
            ) : (
              data.recentWiki.slice(0, 6).map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {w.displayName}
                    </p>
                    <p className="text-xs capitalize text-cp-muted">{w.entityType}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant={w.status === "published" ? "success" : "muted"}
                      className="text-[10px]"
                    >
                      {w.status}
                    </Badge>
                    <time className="text-[10px] tabular-nums text-cp-text-dim">
                      {formatWhen(w.createdAt)}
                    </time>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
