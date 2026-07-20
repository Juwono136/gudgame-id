import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentInviteClient } from "@/components/tournaments/tournament-invite-client";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export const metadata = {
  title: "Accept invite",
};

export default async function TournamentInvitePage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament) notFound();

  return (
    <PageShell>
      <TournamentInviteClient
        sportSlug={sportSlug}
        slug={slug}
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        tournamentType={tournament.tournamentType}
        officialBilling={tournament.officialBilling}
      />
    </PageShell>
  );
}
