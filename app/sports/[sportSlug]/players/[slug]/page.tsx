import { notFound } from "next/navigation";
import { PlayerDetailLayout } from "@/components/wiki/player/player-detail-layout";
import { getSportBySlug } from "@/lib/wiki/public";
import { getPublishedWikiEntityBySlug } from "@/lib/wiki/service";
import { equipmentFromAttributes, mergeEquipmentIntoAttributes } from "@/lib/wiki/player-equipment";
import { enrichEquipmentFromCatalog } from "@/lib/wiki/gear/equipment-resolve";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const entity = await getPublishedWikiEntityBySlug(sportSlug, "player", slug);
  return { title: entity?.displayName ?? "Player" };
}

export default async function PlayerWikiPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const sport = await getSportBySlug(sportSlug);
  if (!sport) notFound();

  const entity = await getPublishedWikiEntityBySlug(sportSlug, "player", slug);
  if (!entity) notFound();

  const equipment = equipmentFromAttributes(entity.attributes);
  const enrichedEquipment = await enrichEquipmentFromCatalog(sport.id, sportSlug, equipment);
  const enrichedEntity = {
    ...entity,
    attributes: mergeEquipmentIntoAttributes(entity.attributes, enrichedEquipment),
  };

  return <PlayerDetailLayout entity={enrichedEntity} sportName={sport.name} />;
}
