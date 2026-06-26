import { notFound } from "next/navigation";
import { EntityListPage } from "@/components/wiki/entity-list-page";
import { getSportBySlug, listPublishedWikiEntities } from "@/lib/wiki/public";

type PageProps = {
  params: Promise<{ sportSlug: string }>;
};

export default async function TeamsListPage({ params }: PageProps) {
  const { sportSlug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport) notFound();

  const items = await listPublishedWikiEntities(sportSlug, "team");

  return (
    <EntityListPage
      sportSlug={sportSlug}
      sportName={sport.name}
      entityType="team"
      items={items}
    />
  );
}
