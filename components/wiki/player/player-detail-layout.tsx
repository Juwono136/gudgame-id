import type { WikiEntityDetail } from "@/lib/wiki/service";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { PlayerHero } from "@/components/wiki/player/player-hero";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import { PlayerCareerStatsSection } from "@/components/wiki/player/player-career-stats";
import {
  PlayerRecentMatchesSection,
  PlayerTournamentHistorySection,
} from "@/components/wiki/player/player-matches-section";
import { PlayerSidebar } from "@/components/wiki/player/player-sidebar";
import { publicSportRoutes } from "@/lib/constants/routes";
import { WIKI_ENTITY_TYPE_PLURAL } from "@/lib/wiki/constants";
import { resolveWikiImageUrl } from "@/lib/media/client";
import { equipmentFromAttributes } from "@/lib/wiki/player-equipment";
import {
  getPlayerCareerStats,
  getSignatureGearItem,
} from "@/lib/wiki/player-career-stats";
import {
  parsePlayerEditableAttributes,
  parseSocialLinks,
} from "@/lib/wiki/player-profile-fields";

type PlayerDetailLayoutProps = {
  entity: WikiEntityDetail;
  sportName: string;
};

export function PlayerDetailLayout({ entity, sportName }: PlayerDetailLayoutProps) {
  const playerEditable = parsePlayerEditableAttributes(entity.attributes);
  const playerCareer = getPlayerCareerStats(entity);
  const playerEquipment = equipmentFromAttributes(entity.attributes);
  const signatureGear = getSignatureGearItem(entity.attributes);
  const socialLinks = parseSocialLinks(entity.attributes.socialLinks);

  const galleryUrls = entity.gallery
    .map((m) => resolveWikiImageUrl(m.url))
    .filter((u): u is string => Boolean(u));

  const primaryImage = resolveWikiImageUrl(
    entity.primaryImageUrl,
    entity.primaryImageStorageKey,
  );

  const badges: { label: string; variant: "nationality" | "tier" | "default" }[] = [];

  if (playerCareer.tier) {
    badges.push({
      label: `${playerCareer.tier.toUpperCase()} TIER`,
      variant: "tier",
    });
  }
  if (playerEditable.nationality) {
    badges.push({
      label: playerEditable.nationality.toUpperCase(),
      variant: "nationality",
    });
  }

  return (
    <WikiPageShell
      showGridBackground={false}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: sportName, href: publicSportRoutes.sportHub(entity.sportSlug) },
        {
          label: WIKI_ENTITY_TYPE_PLURAL.player,
          href: publicSportRoutes.players(entity.sportSlug),
        },
        { label: entity.displayName },
      ]}
    >
      <PlayerHero
        displayName={entity.displayName}
        nickname={entity.nickname}
        summary={entity.summary}
        imageUrl={primaryImage}
        badges={badges}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-3 lg:gap-8">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          <PlayerCareerStatsSection stats={playerCareer} />

          {entity.biography ? (
            <PlayerPageCard title="Biography">
              <RichHtmlContent html={entity.biography} variant="article" />
            </PlayerPageCard>
          ) : null}

          <PlayerRecentMatchesSection />
          <PlayerTournamentHistorySection />
        </div>

        <div className="order-1 lg:order-2">
          <PlayerSidebar
            displayName={entity.displayName}
            nationality={playerEditable.nationality}
            age={playerEditable.age}
            yearsActive={playerCareer.yearsActive}
            signatureGear={signatureGear}
            socialLinks={socialLinks}
            equipment={
              signatureGear
                ? playerEquipment.filter((item) => item.id !== signatureGear.id)
                : playerEquipment
            }
            galleryUrls={galleryUrls}
          />
        </div>
      </div>
    </WikiPageShell>
  );
}
