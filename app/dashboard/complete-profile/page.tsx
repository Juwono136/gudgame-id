import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { CompleteProfileForm } from "@/components/dashboard/complete-profile-form";
import { requireAccountSettingsAccess } from "@/lib/auth/role-guard";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";
import { getProfileMissingFieldLabels } from "@/lib/auth/profile-completion-shared";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { dashboardRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Complete Profile",
};

export default async function CompleteProfilePage() {
  const { roles, userId } = await requireAccountSettingsAccess();

  const [dbUser] = await getDb()
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) redirect(dashboardRoutes.home);

  if (dbUser.profileOnboardingCompletedAt) {
    redirect(`${dashboardRoutes.settings}#profile`);
  }

  const status = getProfileCompletionStatus(dbUser);
  if (status.isComplete) {
    redirect(getDefaultDashboardUrl(roles));
  }

  const missingLabels = getProfileMissingFieldLabels(status.missingFields);

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={getDefaultDashboardUrl(roles)}
          className="inline-flex items-center text-sm font-medium text-cp-primary transition-colors hover:text-cp-logo-accent hover:underline"
        >
          ← Back to dashboard
        </Link>

        <header className="mt-5 space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Personalize your game
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-cp-muted">
            Tell us a bit about yourself to tailor your wiki and tournament experience. Photo is
            optional — you can update everything later in Settings.
          </p>

          <div className="rounded-xl border border-cp-border bg-cp-card cp-shadow-card p-4 dark:bg-cp-elevated/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                Progress
              </p>
              <p className="text-xs font-semibold text-cp-primary dark:text-cp-logo-accent">
                {status.completionPercent}% complete
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cp-border">
              <div
                className="h-full rounded-full bg-cp-primary transition-all"
                style={{ width: `${status.completionPercent}%` }}
                role="progressbar"
                aria-valuenow={status.completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            {missingLabels.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {missingLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-cp-primary/30 bg-cp-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cp-primary dark:border-cp-primary/25 dark:text-cp-logo-accent"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </header>

        <div className="mt-6 rounded-2xl border border-cp-border bg-cp-card cp-shadow-card p-5 sm:mt-8 sm:p-8">
          <CompleteProfileForm initialFullName={dbUser.fullNameKtp ?? dbUser.name} />
        </div>
      </div>
    </PageShell>
  );
}
