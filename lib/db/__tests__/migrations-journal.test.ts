import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Ensures every SQL migration under db/migrations is registered in the Drizzle journal.
 * Missing journal entries caused production migrate to skip 0012 (group tables) then
 * fail on 0015 ALTER tournament_group_matches.
 */
describe("db migrations journal completeness", () => {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");

  it("lists every *.sql migration file in meta/_journal.json in order", () => {
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
      entries: Array<{ idx: number; tag: string }>;
    };

    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.replace(/\.sql$/, ""))
      .sort();

    const tags = journal.entries.map((e) => e.tag);
    const missing = sqlFiles.filter((f) => !tags.includes(f));
    const orphans = tags.filter((t) => !sqlFiles.includes(t));

    expect(missing, `SQL files missing from journal: ${missing.join(", ")}`).toEqual([]);
    expect(orphans, `Journal tags without SQL files: ${orphans.join(", ")}`).toEqual([]);
    expect(tags).toEqual([...tags].sort((a, b) => a.localeCompare(b)));
    expect(journal.entries.map((e) => e.idx)).toEqual(
      journal.entries.map((_, i) => i),
    );
  });
});
