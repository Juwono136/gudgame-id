/**
 * Server-only infrastructure barrel.
 * Do not import from client components.
 */
export {
  closeRedis,
  getRedis,
  pingRedis,
} from "@/lib/redis";

export { runHealthChecks, type HealthReport } from "@/lib/health";

export {
  ensureStorageBucket,
  getPublicObjectUrl,
  getStorageClient,
  pingStorage,
  uploadObject,
} from "@/lib/storage";
