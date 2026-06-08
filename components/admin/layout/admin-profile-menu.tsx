"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileRoleBadges } from "@/components/layout/profile-role-badges";
import { useLogoutMutation } from "@/hooks/use-auth-mutations";
import { useSessionContext } from "@/hooks/use-session-context";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { getProfileHandle } from "@/lib/auth/user-display";
import { resolveUserImageUrl } from "@/lib/storage/media-url";
import {
  dashboardRoutes,
  isDashboardNavLinkActive,
  isSettingsActive,
} from "@/lib/constants/routes";
import { getDashboardLinksForRoles } from "@/lib/roles/dashboard-links";
import type { AdminSessionContext } from "@/lib/admin/types";
import { siteConfig } from "@/lib/config";
import { ThemeToggleMenuItems } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const menuLinkClass = (active: boolean) =>
  cn(
    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
    active
      ? "bg-cp-primary/15 font-semibold text-foreground"
      : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
  );

const menuIconClass = (active: boolean) =>
  cn("h-4 w-4 shrink-0", active ? "text-cp-primary" : "text-cp-muted");

export function AdminProfileMenu({ context }: { context: AdminSessionContext }) {
  const pathname = usePathname();
  const logout = useLogoutMutation();
  const { confirm } = useConfirmDialog();
  const { data: sessionCtx } = useSessionContext();
  const settingsActive = isSettingsActive(pathname);
  const avatarSrc = resolveUserImageUrl(context.image);
  const profile = getProfileHandle({
    nickname: context.nickname,
    email: context.email,
  });

  const roles =
    sessionCtx?.authenticated && sessionCtx.roles.length > 0
      ? sessionCtx.roles
      : context.roles;
  const dashboardLinks = useMemo(
    () => getDashboardLinksForRoles(roles),
    [roles],
  );

  const requestLogout = async () => {
    const ok = await confirm({
      title: `Sign out of ${siteConfig.shortName}?`,
      description: "You will need to sign in again to access the admin console.",
      confirmLabel: "Log out",
      cancelLabel: "Stay signed in",
      variant: "destructive",
    });
    if (ok) logout.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "rounded-full outline-none ring-cp-primary/0 transition-shadow",
          "hover:ring-2 hover:ring-cp-primary/30 focus-visible:ring-2 focus-visible:ring-cp-primary/50",
        )}
        aria-label="Account menu"
      >
        <Avatar className="h-9 w-9 border border-cp-border">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt={context.name} /> : null}
          <AvatarFallback className="bg-cp-primary/20 text-xs font-semibold text-cp-primary">
            {context.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[200] w-64 border-cp-border bg-cp-card p-2 text-foreground"
        sideOffset={8}
      >
        <div className="mb-2 rounded-xl border border-cp-border bg-cp-elevated/50 px-3 py-3">
          <p className="truncate text-sm font-semibold">{context.name}</p>
          <p className="truncate text-xs text-cp-muted">
            {profile.isNickname ? `@${profile.handle}` : context.email}
          </p>
          <ProfileRoleBadges roles={roles} className="mt-2" />
        </div>
        <DropdownMenuSeparator className="bg-cp-border" />

        {dashboardLinks.map((link) => {
          const Icon = link.icon;
          const active = isDashboardNavLinkActive(pathname, link.href);
          return (
            <DropdownMenuItem
              key={link.href}
              asChild
              className="cursor-pointer rounded-lg p-0 focus:bg-transparent"
            >
              <Link
                href={link.href}
                className={menuLinkClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={menuIconClass(active)} />
                {link.label}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuItem asChild className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
          <Link
            href={dashboardRoutes.settings}
            className={menuLinkClass(settingsActive)}
            aria-current={settingsActive ? "page" : undefined}
          >
            <Settings className={menuIconClass(settingsActive)} />
            My Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-cp-border" />
        <ThemeToggleMenuItems />
        <DropdownMenuSeparator className="bg-cp-border" />
        <DropdownMenuItem
          className="cursor-pointer rounded-lg text-[#ff6b6b] focus:bg-[#ff6b6b]/15 focus:text-[#ff6b6b]"
          disabled={logout.isPending}
          onSelect={(e) => {
            e.preventDefault();
            void requestLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {logout.isPending ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
