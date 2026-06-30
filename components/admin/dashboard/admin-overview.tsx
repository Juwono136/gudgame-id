"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { StatCard } from "@/components/admin/ui/stat-card";
import { AdminRangeFilter } from "@/components/admin/dashboard/admin-range-filter";
import { AdminDashboardCharts } from "@/components/admin/dashboard/admin-dashboard-charts";
import { AdminRecentActivity } from "@/components/admin/dashboard/admin-recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { adminRoutes } from "@/lib/constants/routes";
import type { AdminSessionContext } from "@/lib/admin/types";
import { useAdminDashboardStats } from "@/hooks/use-admin-dashboard";
import type { AdminDashboardRange } from "@/lib/validations/admin-dashboard";
import { useAdminSport } from "@/providers/admin-sport-provider";
import {
  canManageUsers,
  hasPermission,
} from "@/lib/roles/permissions";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function AdminOverview({ context }: { context: AdminSessionContext }) {
  return (
    <AdminShell context={context} title="Dashboard">
      <AdminOverviewContent context={context} />
    </AdminShell>
  );
}

function AdminOverviewContent({ context }: { context: AdminSessionContext }) {
  const { sportSlug } = useAdminSport();
  const [range, setRange] = useState<AdminDashboardRange>("month");
  const { data, isLoading, isFetching, error, refetch } = useAdminDashboardStats(
    range,
    sportSlug,
  );

  const showUsers = canManageUsers(context.roles);
  const showWiki = hasPermission(context.roles, "admin.wiki.manage");

  const rangeLabel =
    range === "week" ? "last 7 days" : range === "month" ? "last 30 days" : "last 12 months";

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">
            Platform overview
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
            <span className="capitalize">{sportSlug}</span> console
          </h2>
          <p className="mt-1 text-sm text-cp-muted">
            Live metrics from users and wiki content. Refreshes every minute.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFetching && !isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </span>
          ) : null}
          <AdminRangeFilter
            value={range}
            onChange={setRange}
            disabled={isLoading}
          />
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
          <p className="text-sm text-red-300">
            {error instanceof Error ? error.message : "Failed to load dashboard"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 text-sm font-semibold text-cp-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-cp-elevated" />
          ))}
        </div>
      ) : data ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="space-y-6"
        >
          <motion.div
            variants={fadeUp}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {showUsers ? (
              <>
                <StatCard
                  label="Total users"
                  value={data.summary.totalUsers}
                  hint={`${data.summary.activeAccounts} active accounts`}
                />
                <StatCard
                  label="Logged in (24h)"
                  value={data.summary.loggedInLast24h}
                  hint="Users with a session in the last day"
                />
                <StatCard
                  label={`New users (${rangeLabel})`}
                  value={data.summary.newUsersInRange}
                  trend={data.summary.newUsersInRange > 0 ? "Growing" : undefined}
                />
              </>
            ) : null}

            {showWiki ? (
              <>
                <StatCard
                  label="Wiki entities"
                  value={data.summary.wikiTotal}
                  hint={`${data.summary.wikiPublished} published · ${data.summary.wikiDraft} draft`}
                />
                <StatCard
                  label={`New wiki (${rangeLabel})`}
                  value={data.summary.newWikiInRange}
                  hint={`Scoped to ${data.sportSlug}`}
                />
              </>
            ) : null}
          </motion.div>

          {(showUsers || showWiki) && (
            <motion.div variants={fadeUp}>
              <div className="mb-4 flex flex-wrap gap-2">
                {showUsers ? (
                  <Link
                    href={adminRoutes.users}
                    className="inline-flex items-center gap-2 rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-cp-primary/40 hover:bg-cp-primary/5"
                  >
                    <Users className="h-4 w-4 text-cp-primary" />
                    User management
                    <ArrowRight className="h-4 w-4 text-cp-muted" />
                  </Link>
                ) : null}
                {showWiki ? (
                  <Link
                    href={adminRoutes.wikiEntities}
                    className="inline-flex items-center gap-2 rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-cp-primary/40 hover:bg-cp-primary/5"
                  >
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    Wiki entities
                    <ArrowRight className="h-4 w-4 text-cp-muted" />
                  </Link>
                ) : null}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <AdminDashboardCharts data={data} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <AdminRecentActivity
              data={data}
              showUsers={showUsers}
              showWiki={showWiki}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </>
  );
}
