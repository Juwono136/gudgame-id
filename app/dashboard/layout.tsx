import { DashboardSportProvider } from "@/providers/dashboard-sport-provider";
import { DashboardSportLayoutClient } from "@/components/dashboard/dashboard-sport-layout-client";
import { requireSession } from "@/lib/auth/session";
import { resolveDashboardSportContext } from "@/lib/dashboard/sport-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const sportCtx = await resolveDashboardSportContext(session.user.id);

  return (
    <DashboardSportProvider
      initialSportSlug={sportCtx.sportSlug}
      initialAvailableSports={sportCtx.availableSports}
    >
      <DashboardSportLayoutClient>{children}</DashboardSportLayoutClient>
    </DashboardSportProvider>
  );
}
