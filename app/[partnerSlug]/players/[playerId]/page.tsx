import { notFound, redirect } from "next/navigation";
import { PartnerPlayerDetailClient } from "@/components/partners/partner-player-detail-client";
import { getServerSession } from "@/lib/auth/session";
import { authRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";
import { isUserPartnerMember } from "@/lib/partners/membership";
import { getPartnerPlayerDetail } from "@/lib/partners/player-stats";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = {
  params: Promise<{ partnerSlug: string; playerId: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerPlayerDetailPage({ params }: PageProps) {
  const { partnerSlug, playerId } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const session = await getServerSession();
  const callbackUrl = partnerPublicRoutes.player(partner.slug, playerId);
  if (!session?.user?.id) {
    redirect(`${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const allowed = await isUserPartnerMember(session.user.id, partner.id);
  if (!allowed) {
    redirect(`${partnerPublicRoutes.home(partner.slug)}?error=players_staff_only`);
  }

  const exists = await getPartnerPlayerDetail(partner.id, playerId);
  if (!exists) notFound();

  const primary = partner.branding.primaryColor ?? "#0d9488";

  return (
    <div className={partnerPageClass("py-8 sm:py-12")}>
      <PartnerPlayerDetailClient
        partnerSlug={partner.slug}
        partnerName={partner.displayName}
        playerId={playerId}
        primaryColor={primary}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { partnerSlug, playerId } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) return { title: "Player", robots: { index: false, follow: false } };
  const player = await getPartnerPlayerDetail(partner.id, playerId);
  return {
    title: player
      ? `${player.fullName} · Players · ${partner.displayName}`
      : `Player · ${partner.displayName}`,
    robots: { index: false, follow: false },
  };
}
