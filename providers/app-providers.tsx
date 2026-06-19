"use client";

import { ConfirmDialogProvider } from "@/providers/confirm-dialog-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ConfirmDialogProvider>
          <DashboardLayoutClient>{children}</DashboardLayoutClient>
        </ConfirmDialogProvider>
        <Toaster richColors position="top-center" closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
