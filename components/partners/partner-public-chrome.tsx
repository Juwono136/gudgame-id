"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartnerPublicNav } from "@/components/partners/partner-public-nav";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import { partnerPublicRoutes } from "@/lib/constants/routes";

type PartnerPublicChromeProps = {
  partnerSlug: string;
  partnerName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  children: React.ReactNode;
};

/** Full-screen venue display only — manage keeps partner navbar/footer. */
function isImmersivePartnerPath(pathname: string): boolean {
  return /\/tournaments\/[^/]+\/display(?:\/|$)/.test(pathname);
}

/**
 * Partner public site chrome. Skips nav/footer on tournament display (TV fullscreen).
 * Manage and public pages keep partner branding chrome.
 */
export function PartnerPublicChrome({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
  accentColor,
  children,
}: PartnerPublicChromeProps) {
  const pathname = usePathname() ?? "";
  const immersive = useMemo(() => isImmersivePartnerPath(pathname), [pathname]);

  const brandStyle = {
    ...partnerBrandCssVars(primaryColor, accentColor),
    /** Align sticky manage/session chrome under partner public nav. */
    ["--site-header-height" as string]: "3.75rem",
  } as React.CSSProperties;

  if (immersive) {
    return (
      <div
        className="relative min-h-dvh min-w-0 overflow-x-clip bg-background text-foreground"
        style={brandStyle}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen min-w-0 overflow-x-clip bg-background text-foreground"
      style={brandStyle}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 10% -10%, ${primaryColor}28, transparent 55%),
            radial-gradient(ellipse 70% 45% at 95% 5%, ${accentColor}22, transparent 50%),
            radial-gradient(ellipse 50% 40% at 50% 100%, ${primaryColor}12, transparent 60%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <PartnerPublicNav
        partnerSlug={partnerSlug}
        partnerName={partnerName}
        logoUrl={logoUrl ?? null}
        primaryColor={primaryColor}
      />

      <main className="min-h-[72vh]">{children}</main>

      <footer className="mt-10 border-t border-cp-border/70 sm:mt-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-3 py-7 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8 sm:text-left lg:px-8">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{partnerName}</p>
            <p className="text-xs text-cp-muted">© {new Date().getFullYear()}</p>
            <p className="text-xs text-cp-muted">
              Powered by{" "}
              <Link
                href="/"
                className="font-semibold text-foreground/80 underline-offset-2 transition-colors hover:text-cp-primary hover:underline"
              >
                Gud Game
              </Link>
            </p>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-cp-muted sm:justify-end"
            aria-label="Footer"
          >
            <Link
              href={partnerPublicRoutes.tournaments(partnerSlug)}
              className="hover:text-foreground"
            >
              Tournaments
            </Link>
            <Link
              href={partnerPublicRoutes.leagues(partnerSlug)}
              className="hover:text-foreground"
            >
              Leagues
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
