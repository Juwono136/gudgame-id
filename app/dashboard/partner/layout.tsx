import { requirePartnerDashboardAccess } from "@/lib/auth/role-guard";

export default async function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePartnerDashboardAccess();
  return children;
}
