import { PartnerDashboardNav } from "@/components/partners/partner-dashboard-nav";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import { partnerPageWidthClass } from "@/lib/partners/layout";
import type { PartnerDashboardView } from "@/lib/partners/service";
import { cn } from "@/lib/utils";

type PartnerDashboardShellProps = {
  partner: PartnerDashboardView;
  children: React.ReactNode;
  className?: string;
};

/**
 * Partner-branded chrome for /dashboard/partner/* — replaces Gud Game navbar/footer.
 */
export function PartnerDashboardShell({
  partner,
  children,
  className,
}: PartnerDashboardShellProps) {
  const primary = partner.branding.primaryColor ?? "#0d9488";
  const accent = partner.branding.accentColor ?? "#14b8a6";

  return (
    <div
      className="relative flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background text-foreground"
      style={partnerBrandCssVars(primary, accent)}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 0% 0%, ${primary}18, transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 0%, ${accent}14, transparent 50%)
          `,
        }}
      />

      <PartnerDashboardNav
        partnerSlug={partner.slug}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        primaryColor={primary}
      />

      <main className={cn("relative z-10", className)}>{children}</main>

      <footer className="mt-auto border-t border-cp-border/70">
        <div
          className={cn(
            partnerPageWidthClass,
            "flex flex-col gap-1 py-5 text-center text-xs text-cp-muted sm:flex-row sm:items-center sm:justify-between sm:py-6 sm:text-left",
          )}
        >
          <p className="font-medium text-foreground">{partner.displayName}</p>
          <p>© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
