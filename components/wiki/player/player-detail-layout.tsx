import type { WikiEntityDetail } from "@/lib/wiki/service";
import type { PlayerCareerStats } from "@/lib/wiki/player-career-stats";
import type { SportInterestItem } from "@/lib/account/player-performance/sport-interests";
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
  getSignatureGearItem,
} from "@/lib/wiki/player-career-stats";
import {
  parsePlayerEditableAttributes,
  parseSocialLinks,
} from "@/lib/wiki/player-profile-fields";

type PlayerDetailLayoutProps = {
  entity: WikiEntityDetail;
  sportName: string;
  careerStats: PlayerCareerStats;
  sportInterests?: SportInterestItem[];
  genderLabel?: string | null;
};

export function PlayerDetailLayout({
  entity,
  sportName,
  careerStats: playerCareer,
  sportInterests = [],
  genderLabel = null,
}: PlayerDetailLayoutProps) {
  const playerEditable = parsePlayerEditableAttributes(entity.attributes);
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
  if (genderLabel) {
    badges.push({
      label: genderLabel.toUpperCase(),
      variant: "default",
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-8">
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

        <div className="order-1 lg:sticky lg:top-6 lg:order-2 lg:self-start">
          <PlayerSidebar
            sportSlug={entity.sportSlug}
            displayName={entity.displayName}
            nationality={playerEditable.nationality}
            age={playerEditable.age}
            yearsActive={playerCareer.yearsActive}
            sportInterests={sportInterests}
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
