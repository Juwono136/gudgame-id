import fs from "node:fs";

export const CANONICAL_DB_NAME = "gudgame_db";
export const LEGACY_DB_NAME = "tanding_db";

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid DATABASE_URL>";
  }
}

export type NormalizeDockerDatabaseUrlOptions = {
  /** When true (default for migrate CLI), process.exit(1) on localhost-in-Docker. */
  fatalOnLocalhost?: boolean;
  log?: (msg: string) => void;
};

/**
 * Inside Docker on network `tunnel`, rewrite stale secrets that still point at
 * host.docker.internal / tanding_db so the app and migrator do not ENOTFOUND.
 */
export function normalizeDockerDatabaseUrl(
  url: string,
  options?: NormalizeDockerDatabaseUrlOptions,
): string {
  let next = url.trim();
  const inDocker = fs.existsSync("/.dockerenv");
  const log = options?.log ?? ((msg: string) => console.warn(msg));
  const fatalOnLocalhost = options?.fatalOnLocalhost ?? true;

  if (inDocker && next.includes("host.docker.internal")) {
    log(
      "[db] Rewriting host.docker.internal → postgres (Docker DNS on network tunnel)",
    );
    next = next.replaceAll("host.docker.internal", "postgres");
  }

  if (next.includes(`/${LEGACY_DB_NAME}`)) {
    log(`[db] Rewriting database ${LEGACY_DB_NAME} → ${CANONICAL_DB_NAME}`);
    next = next.replace(
      new RegExp(`/${LEGACY_DB_NAME}(?=[/?#]|$)`, "g"),
      `/${CANONICAL_DB_NAME}`,
    );
  }

  const pointsAtLocalhost =
    next.includes("@127.0.0.1") ||
    next.includes("@localhost") ||
    next.includes("://127.0.0.1") ||
    next.includes("://localhost");

  if (inDocker && pointsAtLocalhost) {
    const message =
      "[db] DATABASE_URL points to localhost inside a container — use Docker DNS hostname `postgres`.\n" +
      `  Current (masked): ${maskDatabaseUrl(next)}`;
    if (fatalOnLocalhost) {
      console.error(message);
      process.exit(1);
    }
    throw new Error(message);
  }

  return next;
}
