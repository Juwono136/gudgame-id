import { notFound } from "next/navigation";
import { TournamentInviteClient } from "@/components/tournaments/tournament-invite-client";
import { resolveTournamentSurfaceUrls } from "@/lib/constants/routes";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { listPartnerTournaments } from "@/lib/partners/tournaments";
import { toPartnerFunMatchTournament } from "@/lib/partners/tournament-surface";
import { getPartnerTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
};

export const metadata = {
  title: "Accept invite",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerTournamentInvitePage({ params }: PageProps) {
  const { partnerSlug, slug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const listed = (await listPartnerTournaments(partner.id)).find((t) => t.slug === slug);
  if (!listed) notFound();

  const rawTournament = await getPartnerTournamentBySlug(partner.id, listed.sportSlug, slug);
  if (!rawTournament || rawTournament.status === "draft") notFound();
  const tournament = toPartnerFunMatchTournament(rawTournament);

  const surface = resolveTournamentSurfaceUrls({
    sportSlug: tournament.sportSlug,
    slug: tournament.slug,
    partnerId: partner.id,
    partnerSlug: partner.slug,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <TournamentInviteClient
        sportSlug={tournament.sportSlug}
        slug={tournament.slug}
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        tournamentType="fun_match"
        officialBilling={null}
        surfaceUrls={{
          publicUrl: surface.publicUrl,
          manageUrl: surface.manageUrl,
          inviteUrl: surface.inviteUrl,
        }}
      />
    </div>
  );
}
