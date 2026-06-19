import { requireSession } from "@/lib/auth/session";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
