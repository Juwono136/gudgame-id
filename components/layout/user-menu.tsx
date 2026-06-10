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
import { useSession } from "@/lib/auth/client";
import { getProfileHandle } from "@/lib/auth/user-display";
import type { AppRole } from "@/lib/roles/constants";
import { ProfileRoleBadges } from "@/components/layout/profile-role-badges";
import { useLogoutWithConfirm } from "@/hooks/use-logout-with-confirm";
import {
  dashboardRoutes,
  isDashboardNavLinkActive,
  isSettingsActive,
} from "@/lib/constants/routes";
import { getDashboardLinksForRoles } from "@/lib/roles/dashboard-links";
import { useSessionContext } from "@/hooks/use-session-context";
import { resolveUserImageUrl } from "@/lib/media/client";
import { ThemeToggleMenuItems } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  className?: string;
  onNavigate?: () => void;
};

type SessionUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  nickname?: string | null;
};

function getInitials(name: string | null | undefined): string {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TB"
  );
}

function UserProfileCard({
  handle,
  handleTitle,
  isNickname,
  email,
  image,
  imageAlt,
  roles,
  className,
}: {
  handle: string;
  handleTitle: string;
  isNickname: boolean;
  email: string;
  image?: string | null;
  imageAlt: string;
  roles: AppRole[];
  className?: string;
}) {
  const initials = getInitials(imageAlt);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-cp-border bg-cp-elevated/50 px-3 py-3",
        className,
      )}
    >
      <Avatar className="h-11 w-11 shrink-0 border border-cp-border">
        {image ? <AvatarImage src={image} alt={imageAlt} /> : null}
        <AvatarFallback className="bg-cp-primary/20 text-sm font-semibold text-cp-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 overflow-hidden text-left">
        <p
          className="truncate text-sm font-semibold text-foreground"
          title={handleTitle}
        >
          {isNickname ? (
            <>
              <span className="text-cp-muted">@</span>
              {handle}
            </>
          ) : (
            handle
          )}
        </p>
        <p className="truncate text-xs text-cp-muted" title={email}>
          {email}
        </p>
        <ProfileRoleBadges roles={roles} className="mt-2" />
      </div>
    </div>
  );
}

const accountLinkClass = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
    active
      ? "nav-link-active bg-cp-primary/15 font-semibold text-foreground"
      : "font-medium text-cp-muted hover:bg-cp-elevated hover:text-foreground",
  );

const accountIconClass = (active: boolean) =>
  cn("h-4 w-4 shrink-0", active ? "text-cp-primary" : "text-cp-muted");

export function UserMenu({ className, onNavigate }: UserMenuProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const { requestLogout, isLoggingOut } = useLogoutWithConfirm({ onNavigate });
  const hasUser = Boolean(session?.user);
  const { data: sessionCtx } = useSessionContext(hasUser);
  const roles = sessionCtx?.roles ?? [];
  const dashboardLinks = useMemo(
    () => getDashboardLinksForRoles(roles),
    [roles],
  );

  if (isPending || !session?.user) {
    return (
      <div
        className={cn(
          "h-10 w-10 animate-pulse rounded-full border border-cp-border bg-cp-elevated",
          className,
        )}
        aria-hidden
      />
    );
  }

  const user = session.user as SessionUser;
  const initials = getInitials(user.name);
  const profile = getProfileHandle(user);
  const avatarSrc = resolveUserImageUrl(user.image);
  const settingsActive = isSettingsActive(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-cp-border bg-cp-elevated outline-none transition-colors",
          "hover:border-cp-primary/50 hover:ring-2 hover:ring-cp-primary/25",
          "focus-visible:ring-2 focus-visible:ring-cp-primary/50",
          className,
        )}
        aria-label={`Account menu — ${profile.handle}`}
      >
        <Avatar className="h-9 w-9">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.name} /> : null}
          <AvatarFallback className="bg-cp-primary/20 text-xs font-semibold text-cp-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-[200] w-72 border-cp-border bg-cp-card p-2 text-foreground shadow-xl"
        sideOffset={8}
      >
        <UserProfileCard
          handle={profile.handle}
          handleTitle={profile.isNickname ? `@${profile.handle}` : profile.handle}
          isNickname={profile.isNickname}
          email={user.email}
          image={avatarSrc}
          imageAlt={user.name}
          roles={roles}
          className="mb-2 border-0 bg-transparent px-1 py-1"
        />
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
                onClick={onNavigate}
                className={accountLinkClass(active)}
              >
                <Icon className={accountIconClass(active)} />
                {link.label}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuItem asChild className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
          <Link
            href={dashboardRoutes.settings}
            onClick={onNavigate}
            className={accountLinkClass(settingsActive)}
          >
            <Settings className={accountIconClass(settingsActive)} />
            My Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-cp-border" />
        <ThemeToggleMenuItems />
        <DropdownMenuSeparator className="my-1.5 bg-cp-border" />

        <DropdownMenuItem
          className="mt-0.5 cursor-pointer rounded-lg text-sm font-medium text-[#ff6b6b] focus:bg-[#ff6b6b]/15 focus:text-[#ff6b6b]"
          disabled={isLoggingOut}
          onSelect={(e) => {
            e.preventDefault();
            void requestLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mobile drawer account section — profile + links (no separate navbar avatar) */
export function UserMenuMobileLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { requestLogout, isLoggingOut } = useLogoutWithConfirm({ onNavigate });
  const hasUser = Boolean(session?.user);
  const { data: sessionCtx } = useSessionContext(hasUser);
  const roles = sessionCtx?.roles ?? [];
  const dashboardLinks = useMemo(
    () => getDashboardLinksForRoles(roles),
    [roles],
  );

  if (!session?.user) return null;

  const user = session.user as SessionUser;
  const profile = getProfileHandle(user);
  const avatarSrc = resolveUserImageUrl(user.image);
  const settingsActive = isSettingsActive(pathname);

  return (
    <div className="mt-4 border-t border-cp-border pt-4">
      <UserProfileCard
        handle={profile.handle}
        handleTitle={profile.isNickname ? `@${profile.handle}` : profile.handle}
        isNickname={profile.isNickname}
        email={user.email}
        image={avatarSrc}
        imageAlt={user.name}
        roles={roles}
        className="mb-3"
      />

      <nav className="space-y-0.5" aria-label="Account">
        {dashboardLinks.map((link) => {
          const Icon = link.icon;
          const active = isDashboardNavLinkActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={accountLinkClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={accountIconClass(active)} />
              {link.label}
            </Link>
          );
        })}
        <Link
          href={dashboardRoutes.settings}
          onClick={onNavigate}
          className={accountLinkClass(settingsActive)}
          aria-current={settingsActive ? "page" : undefined}
        >
          <Settings className={accountIconClass(settingsActive)} />
          My Settings
        </Link>
        <button
          type="button"
          onClick={() => void requestLogout()}
          disabled={isLoggingOut}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/10 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {isLoggingOut ? "Signing out…" : "Log out"}
        </button>
      </nav>
    </div>
  );
}
