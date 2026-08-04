import { notFound, redirect } from "next/navigation";
import { PartnerPublicEligibilitySearch } from "@/components/partners/partner-public-eligibility-search";
import { getServerSession } from "@/lib/auth/session";
import { authRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";
import { isUserPartnerMember } from "@/lib/partners/membership";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerPlayersPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const session = await getServerSession();
  const callbackUrl = partnerPublicRoutes.players(partner.slug);
  if (!session?.user?.id) {
    redirect(`${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const allowed = await isUserPartnerMember(session.user.id, partner.id);
  if (!allowed) {
    redirect(`${partnerPublicRoutes.home(partner.slug)}?error=players_staff_only`);
  }

  const primary = partner.branding.primaryColor ?? "#0d9488";

  return (
    <div className={partnerPageClass("py-8 sm:py-12")}>
      <div
        className="w-full rounded-2xl border border-cp-border/80 bg-cp-card/85 p-4 shadow-sm backdrop-blur-sm sm:rounded-[1.5rem] sm:p-6 lg:p-8"
        style={{
          background: `linear-gradient(125deg, ${primary}14 0%, transparent 55%), var(--cp-card, transparent)`,
        }}
      >
        <p className="mb-4 text-xs font-medium text-cp-muted sm:mb-5">
          Staff-only · Partner console data for {partner.displayName}. Not shown to public visitors.
        </p>
        <PartnerPublicEligibilitySearch
          partnerSlug={partner.slug}
          partnerName={partner.displayName}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  return {
    title: partner ? `Players · ${partner.displayName}` : "Players",
    robots: { index: false, follow: false },
  };
}
