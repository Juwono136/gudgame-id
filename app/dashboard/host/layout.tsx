import { requireHostDashboardAccess } from "@/lib/auth/role-guard";

export default async function HostDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireHostDashboardAccess();
  return children;
}
