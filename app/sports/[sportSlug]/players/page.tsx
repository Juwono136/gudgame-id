import { notFound } from "next/navigation";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { PlayerRankingTable } from "@/components/wiki/player-ranking-table";
import { getSportBySlug } from "@/lib/wiki/public";
import { publicSportRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export default async function PlayersListPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  return (
    <WikiPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: sport.name, href: publicSportRoutes.sportHub(sportSlug) },
        { label: "Players" },
      ]}
    >
      <PlayerRankingTable sportSlug={sportSlug} sportName={sport.name} />
    </WikiPageShell>
  );
}
