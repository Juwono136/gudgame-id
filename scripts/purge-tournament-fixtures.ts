/**
 * Purge Official FREE QA fixtures + legacy seed tournaments/players.
 *
 * Local:
 *   npm run db:seed:fixtures:purge
 *   npm run db:seed:fixtures:purge -- --players
 *
 * Production deploy (CI): DEPLOY_QA_FIXTURE_PURGE=true
 *   - Deletes only known dummy slugs (`qa-free-*` and legacy seed slugs)
 *   - Always deletes `*@gudgame.local` accounts
 *   - Never recreates fixtures
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { LEGACY_SEED_PLAYER_PREFIXES } from "@/lib/dev/official-free-qa-fixtures";
import {
  assertDevOnlySeed,
  deleteAllGudgameLocalSeedPlayers,
  deleteSeedPlayersByPrefix,
  isDeployQaFixturePurgeMode,
  purgeOfficialFreeQaTournaments,
  takeFlagValue,
} from "@/lib/dev/seed-tournament-fixtures";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "purge-official-free-qa" });

type CliOptions = {
  sportSlug: string | null;
  purgeSeedPlayers: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    sportSlug: "padel",
    purgeSeedPlayers: isDeployQaFixturePurgeMode(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--players" || arg === "--purge-players") {
      opts.purgeSeedPlayers = true;
      continue;
    }
    if (arg === "--all-sports") {
      opts.sportSlug = null;
      continue;
    }
    const sport = takeFlagValue(argv, i, "--sport");
    if (sport != null) {
      opts.sportSlug = sport || "padel";
      if (arg === "--sport") i += 1;
    }
  }

  if (isDeployQaFixturePurgeMode()) {
    opts.sportSlug = null;
    opts.purgeSeedPlayers = true;
  }

  return opts;
}

async function resolveSportIds(sportSlug: string | null): Promise<
  Array<{ id: string; slug: string }>
> {
  const db = getDb();
  if (sportSlug) {
    const [sport] = await db
      .select({ id: sports.id, slug: sports.slug })
      .from(sports)
      .where(eq(sports.slug, sportSlug))
      .limit(1);
    if (!sport) throw new Error(`Sport "${sportSlug}" not found.`);
    return [sport];
  }
  return db.select({ id: sports.id, slug: sports.slug }).from(sports);
}

async function main(): Promise<void> {
  assertDevOnlySeed("purge-official-free-qa", { allowDeployPurge: true });
  const opts = parseArgs(process.argv.slice(2));
  const sportRows = await resolveSportIds(opts.sportSlug);

  let removed = 0;
  let paymentsDeleted = 0;

  for (const sport of sportRows) {
    const purged = await purgeOfficialFreeQaTournaments(sport.id);
    removed += purged.removed;
    paymentsDeleted += purged.paymentsDeleted;
  }

  console.log(
    `[purge-qa] Removed ${removed} tournament(s) across ${sportRows.length} sport(s); payments=${paymentsDeleted}`,
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

  log.info("Official free QA purge complete", {
    removed,
    paymentsDeleted,
    sports: sportRows.map((s) => s.slug),
    deployPurge: isDeployQaFixturePurgeMode(),
  });
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
