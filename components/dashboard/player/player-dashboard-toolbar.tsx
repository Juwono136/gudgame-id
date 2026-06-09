"use client";

import Link from "next/link";
import { ExternalLink, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogoutWithConfirm } from "@/hooks/use-logout-with-confirm";
import { dashboardRoutes } from "@/lib/constants/routes";

type PlayerDashboardToolbarProps = {
  publicPageUrl?: string | null;
};

export function PlayerDashboardToolbar({ publicPageUrl }: PlayerDashboardToolbarProps) {
  const { requestLogout, isLoggingOut } = useLogoutWithConfirm();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <Button
        asChild
        className="rounded-lg bg-cp-primary font-semibold hover:bg-cp-primary-light"
      >
        <Link href={dashboardRoutes.settings}>
          <Settings className="mr-2 h-4 w-4" />
          My Settings
        </Link>
      </Button>

      {publicPageUrl ? (
        <Button asChild variant="outline" className="border-cp-border">
          <Link href={publicPageUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View public page
          </Link>
        </Button>
      ) : null}

      <Button
        variant="outline"
        className="border-cp-border text-foreground hover:bg-cp-elevated"
        disabled={isLoggingOut}
        onClick={() => void requestLogout()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isLoggingOut ? "Signing out…" : "Sign Out"}
      </Button>
    </div>
  );
}
