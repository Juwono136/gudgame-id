import { notFound } from "next/navigation";
import Link from "next/link";
import { PartnerPublicChrome } from "@/components/partners/partner-public-chrome";
import {
  isReservedPartnerSlug,
  normalizePartnerSlug,
} from "@/lib/partners/constants";
import {
  getActivePartnerBySlug,
  getPartnerBySlug,
} from "@/lib/partners/service";
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
              Back to home
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
    <PartnerPublicChrome
      partnerSlug={partner.slug}
      partnerName={partner.displayName}
      logoUrl={partner.logoUrl}
      primaryColor={primary}
      accentColor={accent}
    >
      {children}
    </PartnerPublicChrome>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  const icon = partner?.iconUrl?.trim() || partner?.logoUrl?.trim() || undefined;
  return {
    title: partner?.displayName ?? "Partner",
    icons: icon
      ? {
          icon: [{ url: icon }],
          shortcut: icon,
          apple: icon,
        }
      : undefined,
  };
}

export async function loadPartnerTournamentsForSlug(partnerSlug: string) {
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) return { partner: null, tournaments: [] };
  const tournaments = await listPartnerTournaments(partner.id);
  return { partner, tournaments };
}
