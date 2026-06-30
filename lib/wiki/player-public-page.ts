import "server-only";

import type { PlayerMatchListItem, PlayerTournamentListItem } from "@/lib/account/player-competition/types";
import { listPlayerMatches } from "@/lib/account/player-competition/list-matches";
import { listPlayerTournaments } from "@/lib/account/player-competition/list-tournaments";
import {
  getPlayerWikiProfileForUser,
  type PlayerWikiProfileView,
} from "@/lib/account/player-profile/service";
import { mergeSharedPlayerProfileView } from "@/lib/account/player-profile/merge-profile-view";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import type { WikiEntityDetail } from "@/lib/wiki/service";
import { equipmentFromAttributes } from "@/lib/wiki/player-equipment";
import { parsePlayerEditableAttributes } from "@/lib/wiki/player-profile-fields";
import type { PlayerCareerStats } from "@/lib/wiki/player-career-stats";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";

export type PublicPlayerPageContent = {
  summary: string | null;
  biography: string | null;
  nationality: string | null;
  age: number | null;
  socialLinks: ReturnType<typeof parsePlayerEditableAttributes>["socialLinks"];
  signatureGear: PlayerWikiProfileView["signatureGear"];
  equipment: PlayerWikiProfileView["equipment"];
  galleryUrls: string[];
  careerStats: PlayerCareerStats;
  recentMatches: PlayerMatchListItem[];
  recentTournaments: PlayerTournamentListItem[];
};

export async function getPublicPlayerPageContent(
  entity: WikiEntityDetail,
  ownerUserId: string | null,
  sportName: string,
  careerStats: PlayerCareerStats,
): Promise<PublicPlayerPageContent> {
  const editable = parsePlayerEditableAttributes(entity.attributes);
  const equipment = equipmentFromAttributes(entity.attributes);

  let summary = entity.summary;
  let biography = entity.biography;
  let nationality = editable.nationality ?? null;
  let age = editable.age ?? null;
  let socialLinks = editable.socialLinks ?? [];
  let signatureGear = null;
  let resolvedEquipment = equipment;
  let galleryUrls = entity.gallery
    .map((g) => resolveWikiImageUrl(g.url))
    .filter((u): u is string => Boolean(u));

  if (ownerUserId) {
    const [sharedProfile, sportScopedProfile, matchesResult, tournamentsResult] =
      await Promise.all([
        getPlayerWikiProfileForUser(ownerUserId, undefined, { skipSync: true }),
        getPlayerWikiProfileForUser(ownerUserId, entity.sportSlug, { skipSync: true }),
        listPlayerMatches(ownerUserId, {
          page: 1,
          pageSize: 3,
          result: "all",
          type: "all",
          sortBy: "playedAt",
          sortDir: "desc",
          sportSlug: entity.sportSlug,
        }),
        getUserRoleAssignments(ownerUserId).then((roles) =>
          listPlayerTournaments(ownerUserId, roles, {
            page: 1,
            pageSize: 3,
            scope: "all",
            type: "all",
            sortBy: "year",
            sortDir: "desc",
            sportSlug: entity.sportSlug,
          }),
        ),
      ]);

    if (sharedProfile) {
      const merged = mergeSharedPlayerProfileView(sharedProfile, sportScopedProfile, {
        slug: entity.sportSlug,
        name: sportName,
      });
      summary = merged.summary;
      biography = merged.biography;
      nationality = merged.nationality;
      age = merged.age;
      socialLinks = merged.socialLinks;
      signatureGear = merged.signatureGear;
      resolvedEquipment = merged.equipment;
      galleryUrls = merged.gallery
        .map((g) => resolveWikiImageUrl(g.url))
        .filter((u): u is string => Boolean(u));
    }

    return {
      summary,
      biography,
      nationality,
      age,
      socialLinks,
      signatureGear,
      equipment: resolvedEquipment,
      galleryUrls,
      careerStats,
      recentMatches: matchesResult.items,
      recentTournaments: tournamentsResult.items,
    };
  }

  return {
    summary,
    biography,
    nationality,
    age,
    socialLinks,
    signatureGear: null,
    equipment: resolvedEquipment,
    galleryUrls,
    careerStats,
    recentMatches: [],
    recentTournaments: [],
  };
}