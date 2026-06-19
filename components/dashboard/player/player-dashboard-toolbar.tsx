"use client";

import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogoutWithConfirm } from "@/hooks/use-logout-with-confirm";
import { cn } from "@/lib/utils";

type PlayerDashboardToolbarProps = {
  publicPageUrl?: string | null;
  className?: string;
};

export function PlayerDashboardToolbar({ publicPageUrl, className }: PlayerDashboardToolbarProps) {
  const { requestLogout, isLoggingOut } = useLogoutWithConfirm();

  return (
    <div className={cn("flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end", className)}>
      {publicPageUrl ? (
        <Button asChild size="sm" variant="outline" className="border-cp-border">
          <Link href={publicPageUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Public page
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
