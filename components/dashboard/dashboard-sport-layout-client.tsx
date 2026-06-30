"use client";

import { DashboardMobileSportBar } from "@/components/dashboard/dashboard-mobile-sport-bar";

type DashboardSportLayoutClientProps = {
  children: React.ReactNode;
};

/** Renders dashboard-only chrome that requires DashboardSportProvider. */
export function DashboardSportLayoutClient({ children }: DashboardSportLayoutClientProps) {
  return (
    <>
      <DashboardMobileSportBar />
      {children}
    </>
  );
}
