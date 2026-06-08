"use client";

import Link from "next/link";
import { ClipboardCheck, FileEdit, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileRoleBadges } from "@/components/layout/profile-role-badges";
import { adminRoutes, dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { userCanAccessAdmin } from "@/lib/roles/dashboard-links";
import { canAccessPlayerDashboard } from "@/lib/roles/route-access";

type ContributorDashboardProps = {
  userName: string;
  userEmail: string;
  roles: AppRole[];
};

export function ContributorDashboard({
  userName,
  userEmail,
  roles,
}: ContributorDashboardProps) {
  const canOpenAdmin = userCanAccessAdmin(roles);
  const canOpenPlayer = canAccessPlayerDashboard(roles);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-cp-border bg-cp-card/70 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">
              Contributor workspace
            </p>
            <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              Welcome, {userName}
            </h1>
            <p className="mt-1 text-sm text-cp-muted">{userEmail}</p>
            <ProfileRoleBadges roles={roles} className="mt-3" />
          </div>
          <ClipboardCheck className="hidden h-12 w-12 text-cp-primary/80 sm:block" />
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-cp-muted">
          Edit wiki articles, gear reviews, and community submissions. Your work
          appears on the public site once approved by the moderation team.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cp-border bg-cp-elevated/40 p-4">
            <FileEdit className="h-5 w-5 text-cp-logo-accent" />
            <h2 className="mt-2 text-sm font-semibold text-foreground">Draft content</h2>
            <p className="mt-1 text-xs text-cp-muted">
              Create and update wiki entries tied to your sport expertise.
            </p>
            <Button variant="outline" className="mt-3 border-cp-border" disabled>
              Coming soon
            </Button>
          </div>
          <div className="rounded-xl border border-cp-border bg-cp-elevated/40 p-4">
            <ClipboardCheck className="h-5 w-5 text-cp-logo-accent" />
            <h2 className="mt-2 text-sm font-semibold text-foreground">My submissions</h2>
            <p className="mt-1 text-xs text-cp-muted">
              Track approval status for articles and news you submit.
            </p>
            <Button variant="outline" className="mt-3 border-cp-border" disabled>
              Coming soon
            </Button>
          </div>
        </div>

        {canOpenAdmin || canOpenPlayer ? (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-cp-border pt-6">
            {canOpenPlayer ? (
              <Button asChild variant="outline" className="border-cp-border">
                <Link href={dashboardRoutes.home}>Player dashboard</Link>
              </Button>
            ) : null}
            {canOpenAdmin ? (
              <Button asChild>
                <Link href={adminRoutes.home} className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Console
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
