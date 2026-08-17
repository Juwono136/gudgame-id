"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { History, Plus, Trophy } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { HostTournamentsScopedList } from "@/components/dashboard/host/host-tournaments-scoped-list";
import { WorkspaceScopeTabs } from "@/components/dashboard/workspace-scope-tabs";
import { Button } from "@/components/ui/button";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";

type HostTournamentsHubProps = {
  roles: AppRole[];
};

type HubTab = "active" | "history";

const TABS: {
  id: HubTab;
  label: string;
  shortLabel: string;
  hint: string;
  icon: typeof Trophy;
}[] = [
  {
    id: "active",
    label: "Active",
    shortLabel: "Active",
    hint: "Upcoming & live",
    icon: Trophy,
  },
  {
    id: "history",
    label: "History",
    shortLabel: "History",
    hint: "Final records",
    icon: History,
  },
];

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "live" | "upcoming";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "live"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : tone === "upcoming"
            ? "border-sky-500/25 bg-sky-500/5"
            : "border-cp-border bg-cp-card/60",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function HostTournamentsHub({ roles }: HostTournamentsHubProps) {
  const [tab, setTab] = useState<HubTab>("active");
  const { sportSlug, availableSports } = useDashboardSport();
  const sportName = availableSports.find((s) => s.slug === sportSlug)?.name ?? sportSlug;
  const [counts, setCounts] = useState({
    total: 0,
    live: 0,
    upcoming: 0,
    completed: 0,
  });

  const handleCounts = useCallback(
    (next: { total: number; live: number; upcoming: number; completed: number }) => {
      setCounts(next);
    },
    [],
  );

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="host"
      title="Tournaments"
      description={`${sportName} — manage your events with search, filters, and final records.`}
      breadcrumbs={[
        { label: "Host", href: dashboardRoutes.host },
        { label: "Tournaments" },
      ]}
      actions={
        <Button asChild className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light md:w-auto">
          <Link href={dashboardRoutes.hostTournamentsNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create tournament
          </Link>
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total events" value={counts.total} />
        <StatCard label="Live now" value={counts.live} tone="live" />
        <StatCard label="Upcoming" value={counts.upcoming} tone="upcoming" />
        <StatCard label="Completed" value={counts.completed} />
      </div>

      <WorkspaceScopeTabs
        className="mb-4"
        variant="segmented"
        tabs={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          shortLabel: t.shortLabel,
          hint: t.hint,
          icon: t.icon,
        }))}
        active={tab}
        onChange={setTab}
      />

      <p className="mb-4 text-sm text-cp-muted">
        {tab === "active"
          ? "Search and filter upcoming or live events. Results are paginated so large catalogues stay fast."
          : "Completed and cancelled events with a locked final record for review and disputes."}
      </p>

      <HostTournamentsScopedList
        key={tab}
        scope={tab === "active" ? "active" : "history"}
        onCounts={handleCounts}
      />
    </DashboardWorkspaceShell>
  );
}
