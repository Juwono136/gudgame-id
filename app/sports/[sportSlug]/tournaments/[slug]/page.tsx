import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentPageRouter } from "@/components/tournaments/tournament-page-router";
import { getSportBySlug } from "@/lib/wiki/public";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const tournament = await getTournamentBySlug(sportSlug, slug);
  return { title: tournament ? tournament.name : "Tournament" };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.status === "draft") notFound();

  return (
    <PageShell>
      <TournamentPageRouter tournament={tournament} />
    </PageShell>
  );
}
