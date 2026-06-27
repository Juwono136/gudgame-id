"use client";

import { useEffect, useState } from "react";
import { ProfileCompletionBanner } from "@/components/dashboard/profile-completion-banner";
import { useSessionContext } from "@/hooks/use-session-context";
import type { ProfileCompletionSnapshot } from "@/lib/auth/profile-completion-shared";

type ProfileCompletionSectionProps = {
  /** Server snapshot keeps SSR and client markup in sync. */
  snapshot?: ProfileCompletionSnapshot;
  className?: string;
  settingsHref?: string;
};

export function ProfileCompletionSection({
  snapshot,
  className = "mb-6",
  settingsHref,
}: ProfileCompletionSectionProps) {
  const useClientSession = snapshot == null;
  const { data, isPending } = useSessionContext(useClientSession);
  const [mounted, setMounted] = useState(!useClientSession);

  useEffect(() => {
    if (useClientSession) setMounted(true);
  }, [useClientSession]);

  const resolved: ProfileCompletionSnapshot | null = snapshot
    ? snapshot
    : mounted && !isPending && data?.authenticated
      ? {
          profileComplete: data.profileComplete ?? true,
          profileCompletionPercent: data.profileCompletionPercent ?? 100,
          missingProfileFields: data.missingProfileFields ?? [],
        }
      : null;

  if (!resolved || resolved.profileComplete !== false) {
    return null;
  }

  return (
    <ProfileCompletionBanner
      completionPercent={resolved.profileCompletionPercent}
      missingFields={resolved.missingProfileFields}
      className={className}
      settingsHref={settingsHref}
    />
  );
}
