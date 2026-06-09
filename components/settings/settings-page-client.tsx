"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ProfileCompletionSection } from "@/components/dashboard/profile-completion-section";
import { ThemeSettingsCard } from "@/components/theme/theme-settings-card";
import { AccountInfoReadonly } from "@/components/settings/account-info-readonly";
import { StaffProfileForm } from "@/components/settings/staff-profile-form";
import { PlayerSettingsForm } from "@/components/settings/player-settings-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { useAccountSettings } from "@/hooks/use-account-settings";
import { FadeInView } from "@/components/motion/fade-in";
import { resolvePlayerDisplayNameFromAccount } from "@/lib/wiki/player-profile-fields";

type SettingsPageClientProps = {
  backHref: string;
  email: string;
};

const NAV_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "player-profile", label: "Player page" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
] as const;

export function SettingsPageClient({ backHref, email }: SettingsPageClientProps) {
  const { data, isLoading, isError, refetch } = useAccountSettings();

  const isPlayer = data?.roles.includes("player");

  const navItems = NAV_ITEMS.filter((item) => {
    if (item.id === "player-profile") return isPlayer;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link href={backHref} className="text-sm text-cp-primary hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Settings
          </h1>
          <p className="mt-2 text-sm text-cp-muted">
            Manage your account, player profile, and preferences for {email}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cp-primary" />
        </div>
      ) : isError || !data ? (
        <div className="mt-10 rounded-2xl border border-cp-border bg-cp-card p-6 text-center">
          <p className="text-sm text-cp-muted">Could not load settings.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 text-sm font-semibold text-cp-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="hidden lg:block">
            <ul className="sticky top-24 space-y-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-cp-muted transition-colors hover:bg-cp-elevated hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-6">
            <FadeInView>
              <ProfileCompletionSection />
            </FadeInView>

            <FadeInView delay={0.04}>
              <StaffProfileForm settings={data} />
            </FadeInView>

            {isPlayer ? (
              <FadeInView delay={0.08}>
                <PlayerSettingsForm
                  key={`player-${data.playerProfile?.id ?? "new"}-${data.playerProfile?.updatedAt ?? ""}-${data.account.fullNameKtp ?? data.account.name ?? ""}`}
                  profile={data.playerProfile}
                  accountImageUrl={data.account.imageUrl}
                  accountFullName={resolvePlayerDisplayNameFromAccount(data.account)}
                />
              </FadeInView>
            ) : null}

            <FadeInView delay={0.12}>
              <AccountInfoReadonly settings={data} />
            </FadeInView>

            <FadeInView delay={0.16}>
              <ChangePasswordForm
                hasPassword={data.auth.hasPassword}
                hasGoogle={data.auth.hasGoogle}
              />
            </FadeInView>

            <FadeInView delay={0.2}>
              <div id="appearance">
                <ThemeSettingsCard variant="settings" />
              </div>
            </FadeInView>
          </div>
        </div>
      )}
    </div>
  );
}
