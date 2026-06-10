/**
 * Detect Next.js / Docker image build (no runtime secrets or database).
 * Shared by env validation, Better Auth, and other boot-time checks.
 */
export function isBuildTimeEnvValidationSkipped(): boolean {
  if (process.env.SKIP_ENV_VALIDATION === "true") return true;
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  return false;
}

/** Placeholder auth secret — only used during `next build`, never in running containers. */
export const DOCKER_BUILD_AUTH_SECRET =
  "docker-build-placeholder-auth-secret-32chars!";
