/**
 * Dev-only: purge format-matrix fixtures from `db:seed:fixtures`.
 *
 * Usage:
 *   npm run db:seed:fixtures:purge
 *   npm run db:seed:fixtures:purge -- --players
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import {
  FORMAT_FIXTURES,
  assertDevOnlySeed,
  deleteSeedPlayersByPrefix,
  purgeTournamentsBySlugs,
  takeFlagValue,
} from "@/lib/dev/seed-tournament-fixtures";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "purge-tournament-fixtures" });

type CliOptions = {
  sportSlug: string;
  purgeSeedPlayers: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    sportSlug: "padel",
    purgeSeedPlayers: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--players" || arg === "--purge-players") {
      opts.purgeSeedPlayers = true;
      continue;
    }
    const sport = takeFlagValue(argv, i, "--sport");
    if (sport != null) {
      opts.sportSlug = sport || "padel";
      if (arg === "--sport") i += 1;
    }
  }

  return opts;
}

async function main(): Promise<void> {
  assertDevOnlySeed("purge-fixtures");
  const opts = parseArgs(process.argv.slice(2));

  const [sport] = await getDb()
    .select({ id: sports.id, slug: sports.slug })
    .from(sports)
    .where(eq(sports.slug, opts.sportSlug))
    .limit(1);

  if (!sport) throw new Error(`Sport "${opts.sportSlug}" not found.`);

  const { removed, paymentsDeleted } = await purgeTournamentsBySlugs({
    sportId: sport.id,
    slugs: FORMAT_FIXTURES.map((f) => f.slug),
  });

  console.log(`[purge-fixtures] Removed ${removed} tournament(s); payments=${paymentsDeleted}`);

  if (opts.purgeSeedPlayers) {
    let deleted = 0;
    for (const def of FORMAT_FIXTURES) {
      deleted += await deleteSeedPlayersByPrefix(def.emailPrefix);
    }
    console.log(`[purge-fixtures] Seed players deleted: ${deleted}`);
  } else {
    console.log("  Tip: add --players to also remove fx-*@gudgame.local accounts.");
  }

  log.info("Format fixtures purge complete", { removed, paymentsDeleted });
  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Purge fixtures failed", err);
  console.error(
    "[purge-fixtures] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
