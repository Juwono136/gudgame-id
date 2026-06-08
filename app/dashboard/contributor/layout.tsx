import { requireContributorDashboardAccess } from "@/lib/auth/role-guard";

export default async function ContributorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireContributorDashboardAccess();
  return children;
}
