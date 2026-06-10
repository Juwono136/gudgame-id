"use client";

import Image from "next/image";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { ProfileRoleBadges } from "@/components/layout/profile-role-badges";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/roles/constants";
import { resolveUserImageUrl } from "@/lib/storage/media-url";
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

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-cp-border bg-cp-card/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cp-border bg-cp-elevated sm:h-16 sm:w-16">
          {avatarSrc ? (
            <Image src={avatarSrc} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-cp-primary">
              <UserCircle className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground sm:text-xl">
            Welcome back, {displayName}
          </p>
          <p className="truncate text-sm text-cp-muted">{email}</p>
          {subtitle ? <p className="mt-1 line-clamp-2 text-sm text-cp-muted">{subtitle}</p> : null}
          <ProfileRoleBadges roles={roles} className="mt-2" />
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
