"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Loader2,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
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
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function defaultCustomFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(todayIso);

  const query = useMemo(
    () =>
      range === "custom"
        ? { range, from: customFrom, to: customTo }
        : { range },
    [range, customFrom, customTo],
  );

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } =
    useAdminDashboardStats(query, sportSlug);

  const showUsers = canManageUsers(context.roles);
  const showWiki = hasPermission(context.roles, "admin.wiki.manage");
  const periodLabel = data?.period.label ?? "selected period";
  const lastSynced = dataUpdatedAt
    ? new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dataUpdatedAt))
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
      {/* Header + filters */}
      <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
        <div className="border-b border-cp-border/70 bg-gradient-to-r from-cp-primary/8 via-transparent to-transparent px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cp-primary">
                Platform overview
              </p>
              <h2 className="mt-1 text-xl font-bold capitalize tracking-tight text-foreground sm:text-2xl">
                {sportSlug} console
              </h2>
              <p className="mt-1 max-w-lg text-sm text-cp-muted">
                Live metrics synced from users and wiki content.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {isFetching ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cp-primary/10 px-2.5 py-1 font-medium text-cp-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing
                </span>
              ) : lastSynced ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cp-elevated px-2.5 py-1 font-medium text-cp-muted">
                  <Activity className="h-3 w-3 text-cp-primary" />
                  Synced {lastSynced}
                </span>
              ) : null}
              {data?.period ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cp-elevated px-2.5 py-1 font-medium text-cp-muted">
                  {data.period.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 sm:px-5 sm:py-4">
          <AdminRangeFilter
            value={range}
            from={customFrom}
            to={customTo}
            onRangeChange={setRange}
            onCustomChange={({ from, to }) => {
              setCustomFrom(from);
              setCustomTo(to);
            }}
            onRefresh={() => void refetch()}
            refreshing={isFetching}
            disabled={isLoading}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl bg-cp-elevated" />
          ))}
        </div>
      ) : data ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-5 sm:space-y-6"
        >
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
          >
            {showUsers ? (
              <>
                <StatCard
                  label="Total users"
                  value={data.summary.totalUsers}
                  hint={`${data.summary.activeAccounts.toLocaleString()} active`}
                  icon={Users}
                />
                <StatCard
                  label="Logged in 24h"
                  value={data.summary.loggedInLast24h}
                  hint="Active sessions"
                  icon={Activity}
                />
                <StatCard
                  label="New users"
                  value={data.summary.newUsersInRange}
                  hint={periodLabel}
                  trend={data.summary.newUsersInRange > 0 ? "Growing" : undefined}
                  icon={UserPlus}
                />
              </>
            ) : null}
            {showWiki ? (
              <>
                <StatCard
                  label="Wiki entities"
                  value={data.summary.wikiTotal}
                  hint={`${data.summary.wikiPublished} published`}
                  icon={BookOpen}
                />
                <StatCard
                  label="New wiki"
                  value={data.summary.newWikiInRange}
                  hint={periodLabel}
                  icon={Sparkles}
                />
              </>
            ) : null}
          </motion.div>

          {(showUsers || showWiki) && (
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {showUsers ? (
                <Link
                  href={adminRoutes.users}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-cp-border bg-cp-card px-4 py-3 shadow-sm transition-colors hover:border-cp-primary/40 hover:bg-cp-primary/5"
                >
                  <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cp-primary/10 text-cp-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    User management
                  </span>
                  <ArrowRight className="h-4 w-4 text-cp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-cp-primary" />
                </Link>
              ) : null}
              {showWiki ? (
                <Link
                  href={adminRoutes.wikiEntities}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-cp-border bg-cp-card px-4 py-3 shadow-sm transition-colors hover:border-cp-primary/40 hover:bg-cp-primary/5"
                >
                  <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    Wiki entities
                  </span>
                  <ArrowRight className="h-4 w-4 text-cp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-cp-primary" />
                </Link>
              ) : null}
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
    </div>
  );
}
