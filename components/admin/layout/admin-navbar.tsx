"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AdminProfileMenu } from "./admin-profile-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import type { AdminSessionContext } from "@/lib/admin/types";

type AdminNavbarProps = {
  context: AdminSessionContext;
  title: string;
  onMenuOpen: () => void;
};

export function AdminNavbar({ context, title, onMenuOpen }: AdminNavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-cp-border/80 bg-cp-bg/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 border-cp-border lg:hidden"
          onClick={onMenuOpen}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-foreground sm:text-lg">
            {title}
          </p>
        </div>

        <NotificationBell />

        <ThemeToggle />
        <AdminProfileMenu context={context} />
      </div>
    </header>
  );
}
