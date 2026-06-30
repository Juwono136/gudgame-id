import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { PlayerCareerStats } from "@/lib/wiki/player-career-stats";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";

const EMPTY_CAREER_STATS: PlayerCareerStats = {
  worldRank: null,
  totalPoints: null,
  winRate: null,
  tier: null,
  tierLevel: null,
  yearsActive: null,
};

function hasRichText(value: string | null | undefined, minPlainLength = 1): boolean {
  const text = sanitizeRichText(value ?? "").replace(/<[^>]+>/g, "").trim();
  return text.length >= minPlainLength;
}

/** Profile fields that are shared across every sport the player follows. */
export function mergeSharedPlayerProfileView(
  shared: PlayerWikiProfileView,
  sportScoped: PlayerWikiProfileView | null,
  activeSport: { slug: string; name: string },
): PlayerWikiProfileView {
  const statsSource = sportScoped;
  const slug = sportScoped?.slug ?? shared.slug;

  return {
    ...shared,
    sportSlug: activeSport.slug,
    sportName: activeSport.name,
    slug,
    publicUrl: publicSportRoutes.player(activeSport.slug, slug),
    careerStats: statsSource?.careerStats ?? EMPTY_CAREER_STATS,
    yearsActive: statsSource?.careerStats?.yearsActive ?? null,
    equipment: sportScoped?.equipment ?? [],
    signatureGear: sportScoped?.signatureGear ?? null,
    signatureGearId: sportScoped?.signatureGearId ?? null,
  };
}

export function pickRichestSharedPlayerProfile(
  profiles: PlayerWikiProfileView[],
): PlayerWikiProfileView | null {
  if (profiles.length === 0) return null;
  if (profiles.length === 1) return profiles[0]!;

  return profiles.reduce((best, current) => {
    const bestScore = sharedProfileRichnessScore(best);
    const currentScore = sharedProfileRichnessScore(current);
    return currentScore > bestScore ? current : best;
  });
}

function sharedProfileRichnessScore(profile: PlayerWikiProfileView): number {
  let score = 0;
  if (hasRichText(profile.summary, 3)) score += 2;
  if (hasRichText(profile.biography, 20)) score += 4;
  if (profile.nationality?.trim()) score += 1;
  if (profile.age != null && profile.age >= 10) score += 1;
  if (profile.equipment.length > 0) score += 2;
  if (profile.signatureGear) score += 1;
  if (profile.socialLinks.length > 0) score += 1;
  if (profile.gallery.some((g) => Boolean(g.url))) score += 2;
  return score;
}
