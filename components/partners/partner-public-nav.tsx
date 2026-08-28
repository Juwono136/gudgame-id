"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Home, Trophy, UserRound } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePartnerPlayerSession } from "@/hooks/use-partner-player-session";
import { getUserInitials } from "@/lib/auth/user-display";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { resolveUserImageUrl } from "@/lib/media/client";
import { canAccessPartnerDashboard } from "@/lib/roles/route-access";
import { cn } from "@/lib/utils";
import {
  PartnerMobileBottomNav,
  type PartnerMobileNavItem,
} from "@/components/partners/partner-mobile-bottom-nav";

type PartnerPublicNavProps = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

/**
 * Two independent auth realms on the same public site:
 * - Staff/organizer = Gud Game Better Auth (partner role) → Partner Console
 * - Member/player = partner cookie `gg_pps_<slug>` → register / stats
 * Both may coexist; they never share privileges. UI must label them clearly.
 */
export function PartnerPublicNav({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: PartnerPublicNavProps) {
  const pathname = usePathname();
  const { session, isAuthenticated, isLoading, hydrated } =
    usePartnerPlayerSession(partnerSlug);
  const {
    user: staffUser,
    sessionCtx,
    isAuthenticated: isStaffAuthenticated,
    isAuthLoading: isStaffAuthLoading,
  } = useAuthUser();

  const memberLoginHref = `${partnerPublicRoutes.login(partnerSlug)}?callbackUrl=${encodeURIComponent(
    pathname || partnerPublicRoutes.home(partnerSlug),
  )}`;

  const roles = sessionCtx?.roles ?? [];
  const staffRolesReady = Boolean(sessionCtx) || !isStaffAuthenticated;
  const isPartnerStaff =
    hydrated &&
    isStaffAuthenticated &&
    Boolean(staffUser) &&
    staffRolesReady &&
    canAccessPartnerDashboard(roles);

  const showMemberAuthLoading = hydrated && isLoading && !isAuthenticated;
  const showMemberAuthenticated = hydrated && isAuthenticated && Boolean(session);
  const showStaffLoading =
    hydrated &&
    (isStaffAuthLoading || (isStaffAuthenticated && !staffRolesReady)) &&
    !isPartnerStaff &&
    !showMemberAuthenticated;
  const showSignIn =
    hydrated
      ? !showMemberAuthLoading &&
        !showStaffLoading &&
        !showMemberAuthenticated &&
        !isPartnerStaff
      : true;

  const links: PartnerMobileNavItem[] = [
    { href: partnerPublicRoutes.home(partnerSlug), label: "Home", icon: Home, exact: true },
    { href: partnerPublicRoutes.tournaments(partnerSlug), label: "Tournaments", icon: Trophy },
    { href: partnerPublicRoutes.leagues(partnerSlug), label: "Leagues", icon: Building2 },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const staffAvatarSrc = staffUser ? resolveUserImageUrl(staffUser.image) : null;
  const staffInitials = getUserInitials(staffUser?.name ?? staffUser?.email ?? "P");

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-cp-border/70 bg-cp-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-cp-card/75">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent 70%)` }}
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href={partnerPublicRoutes.home(partnerSlug)}
          className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-black/5 transition group-hover:ring-cp-primary/35 dark:ring-white/10 sm:h-10 sm:w-10"
            />
          ) : (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm sm:h-10 sm:w-10"
              style={{ background: primaryColor }}
            >
              {partnerName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
            {partnerName}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {links.map((l) => {
            const active = isActive(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm transition-colors xl:px-3.5",
                  active
                    ? "font-semibold text-foreground"
                    : "text-cp-muted hover:bg-cp-elevated/70 hover:text-foreground",
                )}
              >
                {l.label}
                {active ? (
                  <span
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full"
                    style={{ background: primaryColor }}
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-1 border-l border-cp-border/70 pl-2.5 lg:flex">
            <ThemeToggle />
            {showMemberAuthLoading || showStaffLoading ? (
              <span
                className="ml-1 h-9 w-9 animate-pulse rounded-full bg-cp-elevated"
                aria-hidden
              />
            ) : isPartnerStaff && staffUser ? (
              <PartnerStaffProfileMenu
                partnerName={partnerName}
                avatarSrc={staffAvatarSrc}
                initials={staffInitials}
                displayName={staffUser.name || staffUser.email}
                memberAuthenticated={showMemberAuthenticated}
                memberDisplayName={session?.displayName ?? null}
                memberAccountHref={partnerPublicRoutes.account(partnerSlug)}
                memberLoginHref={memberLoginHref}
                className="ml-1"
              />
            ) : showMemberAuthenticated ? (
              <Button asChild size="sm" variant="outline" className="ml-1 max-w-[10rem]">
                <Link href={partnerPublicRoutes.account(partnerSlug)} className="truncate">
                  {session?.displayName?.split(" ")[0] ?? "Account"}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="ml-1 bg-cp-primary hover:bg-cp-primary-light">
                <Link href={memberLoginHref}>Sign in</Link>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            {isPartnerStaff && staffUser ? (
              <PartnerStaffProfileMenu
                partnerName={partnerName}
                avatarSrc={staffAvatarSrc}
                initials={staffInitials}
                displayName={staffUser.name || staffUser.email}
                memberAuthenticated={showMemberAuthenticated}
                memberDisplayName={session?.displayName ?? null}
                memberAccountHref={partnerPublicRoutes.account(partnerSlug)}
                memberLoginHref={memberLoginHref}
              />
            ) : showMemberAuthenticated ? (
              <Button asChild size="sm" variant="outline" className="max-w-[7rem]">
                <Link href={partnerPublicRoutes.account(partnerSlug)} className="truncate">
                  {session?.displayName?.split(" ")[0] ?? "Account"}
                </Link>
              </Button>
            ) : showSignIn ? (
              <Button asChild size="sm" className="bg-cp-primary hover:bg-cp-primary-light">
                <Link href={memberLoginHref}>Sign in</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </header>

    <PartnerMobileBottomNav
      items={links}
      pathname={pathname}
      primaryColor={primaryColor}
    />
    </>
  );
}

function PartnerStaffProfileMenu({
  partnerName,
  avatarSrc,
  initials,
  displayName,
  memberAuthenticated,
  memberDisplayName,
  memberAccountHref,
  memberLoginHref,
  className,
}: {
  partnerName: string;
  avatarSrc: string | null;
  initials: string;
  displayName: string;
  memberAuthenticated: boolean;
  memberDisplayName: string | null;
  memberAccountHref: string;
  memberLoginHref: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const continueAsPlayer = () => {
    setConfirmOpen(false);
    router.push(memberLoginHref);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-cp-border bg-cp-elevated outline-none transition-colors",
            "hover:border-cp-primary/50 hover:ring-2 hover:ring-cp-primary/25",
            "focus-visible:ring-2 focus-visible:ring-cp-primary/50",
            className,
          )}
          aria-label={`Partner staff — ${displayName}`}
        >
          <Avatar key={avatarSrc ?? "fallback"} className="h-8 w-8">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
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
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-[11px] text-cp-muted">Partner staff · Gud Game</p>
            {memberAuthenticated && memberDisplayName ? (
              <p className="mt-1.5 rounded-md bg-cp-elevated/60 px-2 py-1 text-[11px] text-cp-muted">
                Also signed in as player{" "}
                <span className="font-medium text-foreground">{memberDisplayName}</span>
              </p>
            ) : null}
          </div>
          <DropdownMenuSeparator className="bg-cp-border" />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
            <Link
              href={dashboardRoutes.partner}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-cp-elevated"
            >
              <Building2 className="h-4 w-4 text-cp-primary" aria-hidden />
              Open Partner Console
            </Link>
          </DropdownMenuItem>
          {memberAuthenticated ? (
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg p-0 focus:bg-transparent">
              <Link
                href={memberAccountHref}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-cp-muted hover:bg-cp-elevated hover:text-foreground"
              >
                <UserRound className="h-4 w-4" aria-hidden />
                <span className="min-w-0 truncate">
                  Player account
                  {memberDisplayName ? (
                    <span className="block truncate text-[11px] font-normal opacity-80">
                      {memberDisplayName}
                    </span>
                  ) : null}
                </span>
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-cp-muted focus:bg-cp-elevated focus:text-foreground"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              <UserRound className="mr-2.5 h-4 w-4" aria-hidden />
              Also sign in as player…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in as a {partnerName} player?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>
                  Your Gud Game{" "}
                  <span className="font-medium text-foreground">staff</span> session stays
                  active. Player sign-in uses a{" "}
                  <span className="font-medium text-foreground">separate</span> member cookie for
                  this partner only.
                </p>
                <p>
                  Staff privileges (Partner Console) and player privileges (register / stats)
                  never share access. You can sign out of either side independently.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-cp-primary hover:bg-cp-primary-light"
              onClick={continueAsPlayer}
            >
              Continue to player sign in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
