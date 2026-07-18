"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileRoleBadges } from "@/components/layout/profile-role-badges";
import { Button } from "@/components/ui/button";
import { getUserInitials } from "@/lib/auth/user-display";
import type { AppRole } from "@/lib/roles/constants";
import { resolveUserImageUrl } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type DashboardWelcomeCardProps = {
  displayName: string;
  email: string;
  imageUrl?: string | null;
  roles: AppRole[];
  subtitle?: string | null;
  action?: { label: string; href: string };
  className?: string;
};

export function DashboardWelcomeCard({
  displayName,
  email,
  imageUrl,
  roles,
  subtitle,
  action,
  className,
}: DashboardWelcomeCardProps) {
  const avatarSrc = resolveUserImageUrl(imageUrl);
  const initials = getUserInitials(displayName);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-cp-border bg-cp-card/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <Avatar className="h-12 w-12 shrink-0 rounded-xl border border-cp-border sm:h-16 sm:w-16 after:rounded-xl">
          {avatarSrc ? (
            <AvatarImage src={avatarSrc} alt="" className="rounded-xl" />
          ) : null}
          <AvatarFallback className="rounded-xl bg-cp-primary/20 text-sm font-semibold text-cp-primary sm:text-base">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cp-muted sm:text-base">Welcome back,</p>
          <p className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg md:text-xl">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-xs text-cp-muted sm:text-sm">{email}</p>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cp-muted sm:text-sm">
              {subtitle}
            </p>
          ) : null}
          <ProfileRoleBadges roles={roles} className="mt-2 flex-wrap" />
        </div>
      </div>
      {action ? (
        <Button asChild className="w-full shrink-0 sm:w-auto" variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
