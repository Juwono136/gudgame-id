import { notFound } from "next/navigation";
import Link from "next/link";
import { PartnerPublicNav } from "@/components/partners/partner-public-nav";
import {
  getActivePartnerBySlug,
  getPartnerBySlug,
} from "@/lib/partners/service";
import {
  isReservedPartnerSlug,
  normalizePartnerSlug,
} from "@/lib/partners/constants";
import { listPartnerTournaments } from "@/lib/partners/tournaments";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ partnerSlug: string }>;
};

export default async function PartnerPublicLayout({ children, params }: LayoutProps) {
  const { partnerSlug: raw } = await params;
  if (isReservedPartnerSlug(raw)) notFound();

  const normalized = normalizePartnerSlug(raw);
  if (!normalized) notFound();

  const partner = await getActivePartnerBySlug(normalized);
  if (!partner) {
    const exists = await getPartnerBySlug(normalized);
    if (exists && !exists.isActive) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
          <div className="max-w-sm rounded-2xl border border-cp-border bg-cp-card p-8 shadow-sm">
            <h1 className="text-xl font-bold text-foreground">Partner unavailable</h1>
            <p className="mt-2 text-sm text-cp-muted">
              This white-label site is currently inactive.
            </p>
            <Link href="/" className="mt-5 inline-block text-sm font-medium text-cp-primary hover:underline">
              Back to Gud Game
            </Link>
          </div>
        </div>
      );
    }
    notFound();
  }

  const primary = partner.branding.primaryColor ?? "#0d9488";
  const accent = partner.branding.accentColor ?? "#14b8a6";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-background text-foreground"
      style={
        {
          ["--cp-primary" as string]: primary,
          ["--cp-primary-light" as string]: accent,
          ["--partner-accent" as string]: accent,
          ["--ring" as string]: primary,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 10% -10%, ${primary}28, transparent 55%),
            radial-gradient(ellipse 70% 45% at 95% 5%, ${accent}22, transparent 50%),
            radial-gradient(ellipse 50% 40% at 50% 100%, ${primary}12, transparent 60%)
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
        partnerSlug={partner.slug}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        primaryColor={primary}
      />

      <main className="min-h-[72vh]">{children}</main>

      <footer className="mt-8 border-t border-cp-border/70 bg-cp-card/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <div>
            <p className="text-sm font-semibold text-foreground">{partner.displayName}</p>
            <p className="mt-0.5 text-xs text-cp-muted">
              White-label events · powered by Gud Game
            </p>
          </div>
          <p className="text-[11px] text-cp-muted">
            Sign in once with your Gud Game account — it works here too.
          </p>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  return { title: partner?.displayName ?? "Partner" };
}

export async function loadPartnerTournamentsForSlug(partnerSlug: string) {
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) return { partner: null, tournaments: [] };
  const tournaments = await listPartnerTournaments(partner.id);
  return { partner, tournaments };
}
