/**
 * Dev-only: purge Official FREE QA fixtures + legacy seed tournaments/players.
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
  LEGACY_SEED_PLAYER_PREFIXES,
  LEGACY_SEED_TOURNAMENT_SLUGS,
} from "@/lib/dev/official-free-qa-fixtures";
import {
  assertDevOnlySeed,
  deleteAllGudgameLocalSeedPlayers,
  deleteSeedPlayersByPrefix,
  purgeTournamentsBySlugLike,
  purgeTournamentsBySlugs,
  takeFlagValue,
} from "@/lib/dev/seed-tournament-fixtures";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "purge-official-free-qa" });

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
  assertDevOnlySeed("purge-official-free-qa", { allowDeployRefresh: true });
  const opts = parseArgs(process.argv.slice(2));

  const [sport] = await getDb()
    .select({ id: sports.id, slug: sports.slug })
    .from(sports)
    .where(eq(sports.slug, opts.sportSlug))
    .limit(1);

  if (!sport) throw new Error(`Sport "${opts.sportSlug}" not found.`);

  const legacy = await purgeTournamentsBySlugs({
    sportId: sport.id,
    slugs: [...LEGACY_SEED_TOURNAMENT_SLUGS],
  });
  const qa = await purgeTournamentsBySlugLike({
    sportId: sport.id,
    pattern: "qa-free-%",
  });
  const dev = await purgeTournamentsBySlugLike({
    sportId: sport.id,
    pattern: "dev-%",
  });

  const removed = legacy.removed + qa.removed + dev.removed;
  const paymentsDeleted =
    legacy.paymentsDeleted + qa.paymentsDeleted + dev.paymentsDeleted;

  console.log(
    `[purge-qa] Removed ${removed} tournament(s); payments=${paymentsDeleted}`,
  );

  if (opts.purgeSeedPlayers) {
    let deleted = 0;
    for (const prefix of LEGACY_SEED_PLAYER_PREFIXES) {
      deleted += await deleteSeedPlayersByPrefix(prefix);
    }
    deleted += await deleteAllGudgameLocalSeedPlayers();
    console.log(`[purge-qa] Seed players deleted: ${deleted}`);
  } else {
    console.log("  Tip: add --players to also remove *@gudgame.local accounts.");
  }

  log.info("Official free QA purge complete", { removed, paymentsDeleted });
  await closeDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  log.error("Purge QA fixtures failed", err);
  console.error("[purge-qa] Failed:", err instanceof Error ? err.message : String(err));
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
