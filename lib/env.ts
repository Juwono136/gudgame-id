/**
 * @deprecated Import from `@/lib/config` instead.
 * Kept for backward compatibility during early development.
 */
export { getClientEnv, type ClientEnv } from "@/lib/config/env.client";
export {
  assertProductionEnv,
  getServerEnv,
  tryGetServerEnv,
  type ServerEnv,
} from "@/lib/config/env.server";
