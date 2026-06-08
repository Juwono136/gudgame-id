import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { ThemeSettingsCard } from "@/components/theme/theme-settings-card";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { roles } = await requireAccountSettingsAccess();
  const session = await getServerSession();
  if (!session?.user) return null;
  const backHref = getDefaultDashboardUrl(roles);

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          className="text-sm text-cp-primary hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-cp-muted">
          Account preferences for {session.user.email}
        </p>
        <div className="mt-8 space-y-6">
          <ThemeSettingsCard />
          <div className="rounded-2xl border border-cp-border bg-cp-card/60 p-6">
            <p className="text-sm text-cp-muted">
              Profile and notification settings will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
