import "server-only";

import { getUserAccountStatusById } from "@/lib/auth/account-status";
import { getServerSession } from "@/lib/auth/session";
import { withCache, invalidateCached } from "@/lib/cache/redis-cache";
import type { AppRole } from "@/lib/roles/constants";
import { getUserRoleAssignments } from "@/lib/roles/sync";

const PROXY_SESSION_CACHE_PREFIX = "proxy-session";
const PROXY_SESSION_TTL_SECONDS = 45;

export type ProxySessionContext = {
  roles: AppRole[];
  mustChangePassword: boolean;
  accountInactive: boolean;
};

/**
 * Slim session flags for request proxy — avoids the full session-context payload.
 * Cached briefly in Redis so concurrent navigations (and HMR refresh) do not
 * re-hit Postgres for every authenticated page view.
 */
export async function resolveProxySessionContext(options: {
  needRoles: boolean;
}): Promise<ProxySessionContext | null> {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const cacheKey = `${userId}:${options.needRoles ? "roles" : "flags"}`;

  return withCache(
    cacheKey,
    async () => {
      const account = await getUserAccountStatusById(userId);
      if (!account) {
        return {
          roles: [] as AppRole[],
          mustChangePassword: false,
          accountInactive: false,
        };
      }

      if (!account.isActive) {
        return {
          roles: [] as AppRole[],
          mustChangePassword: false,
          accountInactive: true,
        };
      }

      const roles = options.needRoles
        ? await getUserRoleAssignments(userId)
        : ([] as AppRole[]);

      return {
        roles,
        mustChangePassword: account.mustChangePassword,
        accountInactive: false,
      } satisfies ProxySessionContext;
    },
    { ttlSeconds: PROXY_SESSION_TTL_SECONDS, prefix: PROXY_SESSION_CACHE_PREFIX },
  );
}

/** Drop cached proxy session after role / account / password changes. */
export async function invalidateProxySessionCache(userId: string): Promise<void> {
  await Promise.all([
    invalidateCached(`${userId}:flags`, PROXY_SESSION_CACHE_PREFIX),
    invalidateCached(`${userId}:roles`, PROXY_SESSION_CACHE_PREFIX),
  ]);
}
