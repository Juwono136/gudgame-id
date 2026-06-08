import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";

export default async function DashboardSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccountSettingsAccess();
  return children;
}
