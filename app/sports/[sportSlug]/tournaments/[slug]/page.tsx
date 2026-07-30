import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentPageRouter } from "@/components/tournaments/tournament-page-router";
import { getSportBySlug } from "@/lib/wiki/public";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const tournament = await getTournamentBySlug(sportSlug, slug);
  return { title: tournament ? tournament.name : "Tournament" };
}

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const { sportSlug, slug } = await params;
  const sp = await searchParams;
  if (sp.manage === "1") {
    redirect(`/sports/${sportSlug}/tournaments/${slug}/manage`);
  }
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  // Partner white-label events are not shown on Gud Game sport routes.
  if (!tournament || tournament.status === "draft" || tournament.partnerId) notFound();

  return (
    <PageShell>
      <TournamentPageRouter tournament={tournament} />
    </PageShell>
  );
}
