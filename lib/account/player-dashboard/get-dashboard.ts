import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { AppError } from "@/lib/errors";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";
import { getPlayerWikiProfileForUser } from "@/lib/account/player-profile/service";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { getMediaProxyPath, resolveUserImageUrl } from "@/lib/storage/media-url";
import { resolveSportInterestItems } from "@/lib/account/player-performance/sport-interests";
import { resolvePlayerDisplayNameFromAccount } from "@/lib/wiki/player-profile-fields";
import { listPlayerMatches } from "@/lib/account/player-competition/list-matches";
import { listPlayerTournaments } from "@/lib/account/player-competition/list-tournaments";
import type {
  PlayerMatchListItem,
  PlayerTournamentListItem,
} from "@/lib/account/player-competition/types";
import {
  getPlayerPageCompletionStatus,
  type PlayerPageCompletionStatus,
} from "@/lib/account/player-dashboard/player-page-completion";
import type { SportInterestItem } from "@/lib/account/player-performance/sport-interests";
import type { ProfileCompletionStatus } from "@/lib/auth/profile-completion";
import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";
import type { AppRole } from "@/lib/roles/constants";
import { resolveDashboardSportContext } from "@/lib/dashboard/sport-context";
import { mergeSharedPlayerProfileView } from "@/lib/account/player-profile/merge-profile-view";

export type PlayerDashboardView = {
  account: {
    id: string;
    email: string;
    name: string | null;
    fullNameKtp: string | null;
    displayName: string;
    imageUrl: string | null;
  };
  roles: AppRole[];
  activeSport: { slug: string; name: string };
  accountCompletion: ProfileCompletionStatus;
  playerProfile: PlayerWikiProfileView | null;
  playerPageCompletion: PlayerPageCompletionStatus;
  recentMatches: PlayerMatchListItem[];
  recentTournaments: PlayerTournamentListItem[];
  sportInterests: SportInterestItem[];
};

export async function getPlayerDashboardData(userId: string): Promise<PlayerDashboardView> {
  const [dbUser] = await getDb()
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      fullNameKtp: user.fullNameKtp,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      sportInterestSlugs: user.sportInterestSlugs,
      gender: user.gender,
      image: user.image,
      imageStorageKey: user.imageStorageKey,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const roles = await getUserRoleAssignments(userId);
  const sportCtx = await resolveDashboardSportContext(userId);
  const activeSportName =
    sportCtx.availableSports.find((s) => s.slug === sportCtx.sportSlug)?.name ??
    sportCtx.sportSlug;

  const sharedProfile = await getPlayerWikiProfileForUser(userId);
  const sportScopedProfile = sportCtx.sportId
    ? await getPlayerWikiProfileForUser(userId, sportCtx.sportSlug)
    : null;

  const playerProfile =
    sharedProfile != null
      ? mergeSharedPlayerProfileView(sharedProfile, sportScopedProfile, {
          slug: sportCtx.sportSlug,
          name: activeSportName,
        })
      : sportScopedProfile;

  const sportScope = sportCtx.sportId ? { sportSlug: sportCtx.sportSlug } : undefined;

  const [recentMatchesResult, recentTournamentsResult] = await Promise.all([
    listPlayerMatches(userId, {
      page: 1,
      pageSize: 3,
      result: "all",
      type: "all",
      sortBy: "playedAt",
      sortDir: "desc",
      ...sportScope,
    }),
    listPlayerTournaments(userId, roles, {
      page: 1,
      pageSize: 3,
      scope: "all",
      type: "all",
      sortBy: "year",
      sortDir: "desc",
      ...sportScope,
    }),
  ]);

  const sportInterests = resolveSportInterestItems(dbUser.sportInterestSlugs ?? []);

  return {
    account: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      fullNameKtp: dbUser.fullNameKtp,
      displayName: resolvePlayerDisplayNameFromAccount(dbUser),
      imageUrl:
        resolveUserImageUrl(dbUser.image) ??
        (dbUser.imageStorageKey ? getMediaProxyPath(dbUser.imageStorageKey) : null),
    },
    roles,
    activeSport: { slug: sportCtx.sportSlug, name: activeSportName },
    accountCompletion: getProfileCompletionStatus(dbUser),
    playerProfile,
    playerPageCompletion: getPlayerPageCompletionStatus(sharedProfile ?? sportScopedProfile),
    recentMatches: recentMatchesResult.items,
    recentTournaments: recentTournamentsResult.items,
    sportInterests,
  };
}
