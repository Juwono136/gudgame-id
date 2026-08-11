"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { ProfileCompletionSection } from "@/components/dashboard/profile-completion-section";
import { ThemeSettingsCard } from "@/components/theme/theme-settings-card";
import { AccountInfoReadonly } from "@/components/settings/account-info-readonly";
import { StaffProfileForm } from "@/components/settings/staff-profile-form";
import { PlayerSettingsForm } from "@/components/settings/player-settings-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { HostRoleRequestCard } from "@/components/settings/host-role-request-card";
import {
  SettingsTabNav,
  type SettingsTab,
  type SettingsTabId,
} from "@/components/settings/settings-tab-nav";
import { useAccountSettings } from "@/hooks/use-account-settings";
import type { AppRole } from "@/lib/roles/constants";
import type { ProfileCompletionSnapshot } from "@/lib/auth/profile-completion-shared";
import { resolvePlayerDisplayNameFromAccount } from "@/lib/wiki/player-profile-fields";
import { cn } from "@/lib/utils";

type SettingsPageClientProps = {
  backHref: string;
  email: string;
  roles: AppRole[];
  workspaceVariant: "player" | "host";
  profileCompletion?: ProfileCompletionSnapshot;
};

const ALL_TABS: SettingsTab[] = [
  { id: "profile", label: "Profile", shortLabel: "Profile" },
  { id: "player-profile", label: "Player page", shortLabel: "Player" },
  { id: "roles", label: "Roles", shortLabel: "Roles" },
  { id: "security", label: "Security", shortLabel: "Security" },
  { id: "appearance", label: "Appearance", shortLabel: "Theme" },
];

function parseHashTab(hash: string, allowed: SettingsTabId[]): SettingsTabId | null {
  const id = hash.replace(/^#/, "") as SettingsTabId;
  return allowed.includes(id) ? id : null;
}

export function SettingsPageClient({
  backHref,
  email,
  roles,
  workspaceVariant,
  profileCompletion,
}: SettingsPageClientProps) {
  const { data, isLoading, isError, refetch } = useAccountSettings();

  const isPlayer = data?.roles.includes("player");

  const tabs = useMemo(
    () =>
      ALL_TABS.filter((tab) => {
        if (tab.id === "player-profile") return isPlayer;
        return true;
      }),
    [isPlayer],
  );

  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const [activeTab, setActiveTab] = useState<SettingsTabId>("profile");

  const syncFromHash = useCallback(() => {
    const fromHash = parseHashTab(window.location.hash, tabIds);
    if (fromHash) setActiveTab(fromHash);
  }, [tabIds]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  useEffect(() => {
    if (data) syncFromHash();
  }, [data, syncFromHash]);

  useEffect(() => {
    if (!tabIds.includes(activeTab)) {
      setActiveTab("profile");
    }
  }, [activeTab, tabIds]);

  const handleTabChange = (id: SettingsTabId) => {
    setActiveTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant={workspaceVariant}
      title="Settings"
      description={`Account, player profile, and preferences for ${email}`}
      breadcrumbs={[
        { label: "Overview", href: backHref },
        { label: "Settings" },
      ]}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cp-primary" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-cp-border bg-cp-card p-6 text-center">
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
        <div className="space-y-6">
          <SettingsTabNav tabs={tabs} active={activeTab} onChange={handleTabChange} />

          <div
            role="tabpanel"
            aria-labelledby={activeTab}
            className={cn("min-w-0", activeTab === "player-profile" ? "max-w-5xl" : "max-w-3xl")}
          >
            {activeTab === "profile" ? (
              <div className="space-y-6">
                <ProfileCompletionSection snapshot={profileCompletion} />
                <StaffProfileForm settings={data} />
                <AccountInfoReadonly settings={data} />
              </div>
            ) : null}

            {activeTab === "player-profile" && isPlayer ? (
              <PlayerSettingsForm
                key={`player-${data.playerProfile?.id ?? "new"}-${data.playerProfile?.updatedAt ?? ""}-${data.account.fullNameKtp ?? data.account.name ?? ""}`}
                profile={data.playerProfile}
                accountImageUrl={data.account.imageUrl}
                accountFullName={resolvePlayerDisplayNameFromAccount(data.account)}
                onGoToProfile={() => handleTabChange("profile")}
              />
            ) : null}

            {activeTab === "roles" ? (
              <div className="space-y-6">
                <HostRoleRequestCard />
              </div>
            ) : null}

            {activeTab === "security" ? (
              <div className="space-y-6">
                <ChangePasswordForm
                  hasPassword={data.auth.hasPassword}
                  hasGoogle={data.auth.hasGoogle}
                />
              </div>
            ) : null}

            {activeTab === "appearance" ? (
              <div id="appearance">
                <ThemeSettingsCard variant="settings" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </DashboardWorkspaceShell>
  );
}
