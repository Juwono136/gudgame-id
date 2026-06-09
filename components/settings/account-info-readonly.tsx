"use client";

import type { AccountSettingsView } from "@/lib/account/settings/get-settings";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";

function ReadOnlyRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1 border-b border-cp-border/70 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-medium uppercase tracking-wide text-cp-muted">{label}</dt>
      <dd className="text-sm text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

type AccountInfoReadonlyProps = {
  settings: AccountSettingsView;
};

export function AccountInfoReadonly({ settings }: AccountInfoReadonlyProps) {
  const { account, roleLabels } = settings;

  return (
    <SettingsSectionCard
      title="Account information"
      description="These details are tied to your login and cannot be changed here unless noted."
    >
      <dl>
        <ReadOnlyRow label="Email" value={account.email} />
        <ReadOnlyRow label="Roles" value={roleLabels.join(", ")} />
        <ReadOnlyRow label="Nickname" value={account.nickname} />
        <ReadOnlyRow label="Club" value={account.clubName} />
        <ReadOnlyRow
          label="Member since"
          value={new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
            new Date(account.createdAt),
          )}
        />
      </dl>
    </SettingsSectionCard>
  );
}
