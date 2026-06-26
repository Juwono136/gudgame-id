import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { SportHubContent } from "@/components/sports/sport-hub-content";
import { getSportBySlug } from "@/lib/wiki/public";
import { listPublicTournamentsBySport } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  return { title: sport ? `${sport.name} — TandingBase` : "Sport" };
}

export default async function SportHubPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const [live, upcoming, past] = await Promise.all([
    listPublicTournamentsBySport(sportSlug, "live", 6),
    listPublicTournamentsBySport(sportSlug, "upcoming", 6),
    listPublicTournamentsBySport(sportSlug, "past", 6),
  ]);

  return (
    <PageShell>
      <SportHubContent sport={sport} live={live} upcoming={upcoming} past={past} />
    </PageShell>
  );
}
