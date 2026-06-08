"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { StatCard } from "@/components/admin/ui/stat-card";
import { adminRoutes } from "@/lib/constants/routes";
import type { AdminSessionContext } from "@/lib/admin/types";
import { getRoleLabel } from "@/lib/roles/constants";
import { useAdminUserStats } from "@/hooks/use-admin-users";
import { canManageUsers } from "@/lib/roles/permissions";

export function AdminOverview({ context }: { context: AdminSessionContext }) {
  const showUsers = canManageUsers(context.roles);
  const { data: stats } = useAdminUserStats(showUsers);

  return (
    <AdminShell context={context} title="Dashboard">
      <p className="mb-6 text-sm text-cp-muted">
        Master console for <span className="capitalize text-foreground">{context.sportSlug}</span>
        — scale across sports from one place.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active sport"
          value={context.sportSlug}
          hint="Switch sport in the sidebar to scope future modules"
        />
        <StatCard
          label="Your roles"
          value={context.roles.map(getRoleLabel).join(", ")}
          hint="Switch dashboards from your profile menu"
        />
        {showUsers ? (
          <>
            <StatCard
              label="Total users"
              value={stats?.totalStaff ?? "—"}
              hint={
                stats
                  ? `${stats.activeAccounts} active accounts`
                  : "All registered users"
              }
            />
            <StatCard
              label="Pending approvals"
              value="—"
              hint="Content moderation — coming soon"
            />
          </>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-cp-border bg-cp-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <p className="mt-1 text-sm text-cp-muted">
            Jump into the modules you have permission to use.
          </p>
          <ul className="mt-4 space-y-2">
            {showUsers ? (
              <li>
                <Link
                  href={adminRoutes.users}
                  className="flex items-center justify-between rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-cp-primary/40"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-cp-primary" />
                    User Management
                  </span>
                  <ArrowRight className="h-4 w-4 text-cp-muted" />
                </Link>
              </li>
            ) : null}
            <li>
              <span className="flex cursor-not-allowed items-center justify-between rounded-xl border border-cp-border/60 px-4 py-3 text-sm text-cp-muted">
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Content Approval
                </span>
                <span className="text-[10px] uppercase tracking-wider">Soon</span>
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-cp-border bg-cp-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground">Multi-sport ready</h2>
          <p className="mt-2 text-sm leading-relaxed text-cp-muted">
            TandingBase is built to add new sports (tennis, pickleball, etc.)
            without rebuilding the admin shell. Each sport can define its own
            rules, brackets, gear catalog, and player tiers — while sharing one
            user directory and role system.
          </p>
          <p className="mt-3 text-xs text-cp-logo-accent">
            Tournament join fees are charged to players at registration time
            (not tournament creators) — planned for a future release.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
