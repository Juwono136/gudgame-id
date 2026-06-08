import { getServerSession } from "@/lib/auth/session";
import { HostDashboard } from "@/components/dashboard/host-dashboard";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Host Dashboard",
};

export default async function HostDashboardPage() {
  const { roles } = await requireHostDashboardAccess();
  const session = await getServerSession();
  const user = session?.user;

  return (
    <HostDashboard
      userName={user?.name ?? "Host"}
      userEmail={user?.email ?? ""}
      roles={roles}
    />
  );
}
