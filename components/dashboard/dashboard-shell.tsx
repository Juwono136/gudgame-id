"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/hooks/use-auth-mutations";
import { resolveUserImageUrl } from "@/lib/storage/media-url";

type DashboardShellProps = {
  userName: string;
  userEmail: string;
  userImage?: string | null;
};

export function DashboardShell({
  userName,
  userEmail,
  userImage,
}: DashboardShellProps) {
  const logout = useLogoutMutation();
  const avatarSrc = resolveUserImageUrl(userImage);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 rounded-2xl border border-cp-border bg-cp-card/70 p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-cp-primary/40 bg-cp-elevated">
            {avatarSrc ? (
              <Image src={avatarSrc} alt={userName} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-cp-primary">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">
              Dashboard
            </p>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Welcome, {userName}
            </h1>
            <p className="text-sm text-cp-muted">{userEmail}</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="border-cp-border text-foreground hover:bg-cp-elevated"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {logout.isPending ? "Signing out…" : "Sign Out"}
        </Button>
      </div>

      <div className="mt-8 rounded-2xl border border-cp-border bg-cp-card/50 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">Your court hub</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          You are signed in with a verified TandingBase account. Player profiles,
          wiki contributions, and tournament tracking will appear here as we roll
          out MVP features.
        </p>
      </div>
    </div>
  );
}
