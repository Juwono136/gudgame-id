/**
 * Dev-only: remove double-stage seed tournament(s).
 *
 * Usage:
 *   npm run db:seed:double-stage:purge -- --all
 *   npm run db:seed:double-stage:purge -- --tier=gold
 *   npm run db:seed:double-stage:purge -- --all --players
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import {
  DOUBLE_STAGE_FIXTURE_SLUG,
  purgeDoubleStageFixtureDetailed,
} from "@/lib/dev/purge-double-stage-fixture";
import {
  assertDevOnlySeed,
  doubleStageSlugForTier,
  takeFlagValue,
} from "@/lib/dev/seed-tournament-fixtures";
import { logger } from "@/lib/logger";
import { normalizePlayerTier } from "@/lib/player/tier";

const log = logger.child({ script: "purge-double-stage-32" });

type CliOptions = {
  sportSlug: string;
  tournamentSlug: string | null;
  allTiers: boolean;
  purgeSeedPlayers: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    sportSlug: "padel",
    tournamentSlug: null,
    allTiers: false,
    purgeSeedPlayers: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--players" || arg === "--purge-players") {
      opts.purgeSeedPlayers = true;
      continue;
    }
    if (arg === "--all") {
      opts.allTiers = true;
      continue;
    }
    const sport = takeFlagValue(argv, i, "--sport");
    if (sport != null) {
      opts.sportSlug = sport || "padel";
      if (arg === "--sport") i += 1;
      continue;
    }
    const slug = takeFlagValue(argv, i, "--slug");
    if (slug != null) {
      opts.tournamentSlug = slug || DOUBLE_STAGE_FIXTURE_SLUG;
      if (arg === "--slug") i += 1;
      continue;
    }
    const tierRaw = takeFlagValue(argv, i, "--tier");
    if (tierRaw != null) {
      const tier = normalizePlayerTier(tierRaw);
      if (!tier) throw new Error(`Unknown --tier "${tierRaw}"`);
      opts.tournamentSlug = doubleStageSlugForTier(tier);
      if (arg === "--tier") i += 1;
    }
  }

  if (!opts.tournamentSlug && !opts.allTiers) {
    opts.allTiers = true;
  }

  return opts;
}

async function main(): Promise<void> {
  assertDevOnlySeed("purge-double-stage");
  const opts = parseArgs(process.argv.slice(2));

  console.log(
    `[purge-double-stage] sport=${opts.sportSlug} all=${opts.allTiers} slug=${opts.tournamentSlug ?? "(all tiers)"} players=${opts.purgeSeedPlayers}`,
  );

  const [sport] = await getDb()
    .select({ id: sports.id, slug: sports.slug })
    .from(sports)
    .where(eq(sports.slug, opts.sportSlug))
    .limit(1);

  if (!sport) {
    throw new Error(`Sport "${opts.sportSlug}" not found.`);
  }

  const result = await purgeDoubleStageFixtureDetailed({
    sportId: sport.id,
    tournamentSlug: opts.tournamentSlug ?? undefined,
    allTiers: opts.allTiers,
    purgeSeedPlayers: opts.purgeSeedPlayers,
  });

  if (!result.removed) {
    console.log("[purge-double-stage] No matching tournaments found.");
  } else {
    console.log("[purge-double-stage] Tournaments removed.");
    console.log(`  payments deleted: ${result.paymentsDeleted}`);
  }

  if (opts.purgeSeedPlayers) {
    console.log(`  seed players deleted: ${result.seedPlayersDeleted}`);
  } else {
    console.log("  Tip: add --players to also remove ds32-*@gudgame.local accounts.");
  }

  log.info("Purge complete", result);
  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Purge failed", err);
  console.error(
    "[purge-double-stage] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
