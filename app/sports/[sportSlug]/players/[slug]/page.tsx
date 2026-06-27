import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PlayerDetailLayout } from "@/components/wiki/player/player-detail-layout";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { wikiEntities } from "@/db/schema/wiki";
import { formatUserGender } from "@/lib/constants/user-gender";
import { getUserSportInterests } from "@/lib/account/player-performance/sport-interests";
import { resolvePlayerCareerStats } from "@/lib/account/player-performance/resolve-career-stats";
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

  const [ownerRow] = await getDb()
    .select({ ownerUserId: wikiEntities.ownerUserId })
    .from(wikiEntities)
    .where(eq(wikiEntities.id, entity.id))
    .limit(1);

  const ownerUserId = ownerRow?.ownerUserId ?? null;
  const ownerGenderLabel = ownerUserId
    ? formatUserGender(
        (
          await getDb()
            .select({ gender: user.gender })
            .from(user)
            .where(eq(user.id, ownerUserId))
            .limit(1)
        )[0]?.gender,
      )
    : null;
  const sportInterests = ownerUserId ? await getUserSportInterests(ownerUserId) : [];

  const careerStats = await resolvePlayerCareerStats({
    entity,
    ownerUserId,
    sportId: entity.sportId,
  });

  const equipment = equipmentFromAttributes(entity.attributes);
  const enrichedEquipment = await enrichEquipmentFromCatalog(sport.id, sportSlug, equipment);
  const enrichedEntity = {
    ...entity,
    attributes: mergeEquipmentIntoAttributes(entity.attributes, enrichedEquipment),
  };

  return (
    <PlayerDetailLayout
      entity={enrichedEntity}
      sportName={sport.name}
      careerStats={careerStats}
      sportInterests={sportInterests}
      genderLabel={ownerGenderLabel}
    />
  );
}
