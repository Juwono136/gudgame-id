"use client";

type DashboardSportLayoutClientProps = {
  children: React.ReactNode;
};

/** Dashboard layout wrapper — sport selector lives in workspace shell (scrolls with content). */
export function DashboardSportLayoutClient({ children }: DashboardSportLayoutClientProps) {
  return <>{children}</>;
}
