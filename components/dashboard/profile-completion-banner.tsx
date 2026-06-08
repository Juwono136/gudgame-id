"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { ProfileMissingField } from "@/lib/auth/profile-completion-shared";
import { getProfileMissingFieldLabels } from "@/lib/auth/profile-completion-shared";
import { cn } from "@/lib/utils";

type ProfileCompletionBannerProps = {
  completionPercent: number;
  missingFields: ProfileMissingField[];
  className?: string;
};

export function ProfileCompletionBanner({
  completionPercent,
  missingFields,
  className,
}: ProfileCompletionBannerProps) {
  if (missingFields.length === 0) return null;

  const labels = getProfileMissingFieldLabels(missingFields);

  return (
    <div
      className={cn(
        "rounded-2xl border border-cp-primary/25 bg-cp-primary/10 p-4 sm:p-5",
        className,
      )}
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/15 text-cp-primary">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Complete your profile ({completionPercent}%)
            </p>
            <p className="mt-1 text-xs leading-relaxed text-cp-muted">
              A few details are still missing so we can verify your player identity and
              unlock the full TandingBase experience.
            </p>
            <ul className="mt-2 list-inside list-disc text-xs text-cp-muted">
              {labels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 rounded-lg bg-cp-primary text-primary-foreground hover:bg-[#0033C0]"
        >
          <Link href={dashboardRoutes.completeProfile}>
            Complete now
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
