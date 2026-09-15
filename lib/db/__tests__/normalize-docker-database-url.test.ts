import { describe, expect, it } from "vitest";
import {
  CANONICAL_DB_NAME,
  LEGACY_DB_NAME,
  normalizeDockerDatabaseUrl,
} from "@/lib/db/normalize-docker-database-url";

describe("normalizeDockerDatabaseUrl", () => {
  it("rewrites legacy tanding_db to gudgame_db", () => {
    const url = `postgres://u:p@postgres:5432/${LEGACY_DB_NAME}?sslmode=disable`;
    const next = normalizeDockerDatabaseUrl(url, {
      fatalOnLocalhost: false,
      log: () => undefined,
    });
    expect(next).toContain(`/${CANONICAL_DB_NAME}`);
    expect(next).not.toContain(LEGACY_DB_NAME);
  });

  it("leaves canonical gudgame_db unchanged", () => {
    const url = `postgres://u:p@postgres:5432/${CANONICAL_DB_NAME}`;
    const next = normalizeDockerDatabaseUrl(url, {
      fatalOnLocalhost: false,
      log: () => undefined,
    });
    expect(next).toBe(url);
  });
});
