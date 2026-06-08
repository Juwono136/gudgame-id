"use client";

import { ProfileCompletionBanner } from "@/components/dashboard/profile-completion-banner";
import { useSessionContext } from "@/hooks/use-session-context";

export function ProfileCompletionSection() {
  const { data } = useSessionContext();

  if (!data?.authenticated || data.profileComplete !== false) {
    return null;
  }

  return (
    <ProfileCompletionBanner
      completionPercent={data.profileCompletionPercent ?? 0}
      missingFields={data.missingProfileFields ?? []}
      className="mb-6"
    />
  );
}
