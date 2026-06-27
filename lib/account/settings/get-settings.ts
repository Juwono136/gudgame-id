import "server-only";

import { eq } from "drizzle-orm";
import { getUserAuthProvidersByUserId } from "@/lib/auth/account-providers";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { getRoleLabel } from "@/lib/roles/constants";
import type { AppRole } from "@/lib/roles/constants";
import { getMediaProxyPath, resolveUserImageUrl } from "@/lib/storage/media-url";
import { getPlayerWikiProfileForUser } from "@/lib/account/player-profile/service";

export type AccountSettingsView = {
  account: {
    id: string;
    email: string;
    name: string | null;
    fullNameKtp: string | null;
    nickname: string | null;
    phone: string | null;
    phoneCountryCode: string | null;
    sportInterestSlugs: string[];
    gender: string | null;
    imageUrl: string | null;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
  roles: AppRole[];
  roleLabels: string[];
  auth: {
    hasPassword: boolean;
    hasGoogle: boolean;
    isGoogleOnly: boolean;
  };
  playerProfile: Awaited<ReturnType<typeof getPlayerWikiProfileForUser>>;
};

export async function getAccountSettings(userId: string): Promise<AccountSettingsView> {
  const [dbUser] = await getDb()
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) {
    throw new Error("User not found");
  }

  const roles = await getUserRoleAssignments(userId);
  const providers = await getUserAuthProvidersByUserId(userId);
  const playerProfile = roles.includes("player")
    ? await getPlayerWikiProfileForUser(userId)
    : null;

  return {
    account: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      fullNameKtp: dbUser.fullNameKtp,
      nickname: dbUser.nickname,
      phone: dbUser.phone,
      phoneCountryCode: dbUser.phoneCountryCode,
      sportInterestSlugs: dbUser.sportInterestSlugs ?? [],
      gender: dbUser.gender,
      imageUrl:
        resolveUserImageUrl(dbUser.image) ??
        (dbUser.imageStorageKey ? getMediaProxyPath(dbUser.imageStorageKey) : null),
      emailVerified: dbUser.emailVerified,
      createdAt: dbUser.createdAt.toISOString(),
      lastLoginAt: dbUser.lastLoginAt?.toISOString() ?? null,
    },
    roles,
    roleLabels: roles.map(getRoleLabel),
    auth: {
      hasPassword: providers.hasPassword,
      hasGoogle: providers.hasGoogle,
      isGoogleOnly: providers.isGoogleOnly,
    },
    playerProfile,
  };
}
