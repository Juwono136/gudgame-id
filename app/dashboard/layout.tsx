import { DashboardSportProvider } from "@/providers/dashboard-sport-provider";
import { DashboardSportLayoutClient } from "@/components/dashboard/dashboard-sport-layout-client";
import { ProfileOnboardingGuard } from "@/components/dashboard/profile-onboarding-guard";
import { requireSession } from "@/lib/auth/session";
import { resolveDashboardSportContext } from "@/lib/dashboard/sport-context";
import { getUserRoleAssignments } from "@/lib/roles/sync";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const sportCtx = await resolveDashboardSportContext(session.user.id);
  const roles = await getUserRoleAssignments(session.user.id);

  return (
    <DashboardSportProvider
      initialSportSlug={sportCtx.sportSlug}
      initialAvailableSports={sportCtx.availableSports}
    >
      <DashboardSportLayoutClient roles={roles}>
        <ProfileOnboardingGuard>{children}</ProfileOnboardingGuard>
      </DashboardSportLayoutClient>
    </DashboardSportProvider>
  );
}
