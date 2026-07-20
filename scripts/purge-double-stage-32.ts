/**
 * Dev-only: remove the double-stage seed tournament (and related teams/matches).
 *
 * Usage:
 *   npm run db:seed:double-stage:purge
 *   npm run db:seed:double-stage:purge -- --slug=dev-double-stage-32
 *   npm run db:seed:double-stage:purge -- --players
 *
 * `--players` also deletes seeded accounts `ds32-p###@gudgame.local`.
 * Does NOT delete the host/creator account.
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
import { logger } from "@/lib/logger";

const log = logger.child({ script: "purge-double-stage-32" });

type CliOptions = {
  sportSlug: string;
  tournamentSlug: string;
  purgeSeedPlayers: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    sportSlug: "padel",
    tournamentSlug: DOUBLE_STAGE_FIXTURE_SLUG,
    purgeSeedPlayers: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--players" || arg === "--purge-players") {
      opts.purgeSeedPlayers = true;
      continue;
    }
    if (arg.startsWith("--sport=")) {
      opts.sportSlug = arg.slice("--sport=".length).trim() || "padel";
      continue;
    }
    if (arg === "--sport") {
      opts.sportSlug = argv[++i]?.trim() || "padel";
      continue;
    }
    if (arg.startsWith("--slug=")) {
      opts.tournamentSlug =
        arg.slice("--slug=".length).trim() || DOUBLE_STAGE_FIXTURE_SLUG;
      continue;
    }
    if (arg === "--slug") {
      opts.tournamentSlug = argv[++i]?.trim() || DOUBLE_STAGE_FIXTURE_SLUG;
    }
  }

  return opts;
}

function assertDevOnly(): void {
  if (process.env.GITHUB_ACTIONS === "true") {
    throw new Error("Refusing to run purge in CI.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.FORCE_DEV_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run purge in production without FORCE_DEV_SEED=true.",
    );
  }
}

async function main(): Promise<void> {
  assertDevOnly();
  const opts = parseArgs(process.argv.slice(2));

  console.log(
    `[purge-double-stage] sport=${opts.sportSlug} slug=${opts.tournamentSlug} players=${opts.purgeSeedPlayers}`,
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
    tournamentSlug: opts.tournamentSlug,
    purgeSeedPlayers: opts.purgeSeedPlayers,
  });

  if (!result.removed) {
    console.log(
      `[purge-double-stage] No tournament "${opts.tournamentSlug}" found — nothing to delete.`,
    );
  } else {
    console.log("[purge-double-stage] Tournament removed cleanly.");
    console.log(`  tournamentId:        ${result.tournamentId}`);
    console.log(`  payments deleted:    ${result.paymentsDeleted}`);
    console.log(`  player matches:      ${result.playerMatchesCleared}`);
    console.log(`  player results:      ${result.playerResultsCleared}`);
  }

  if (opts.purgeSeedPlayers) {
    console.log(`  seed players deleted: ${result.seedPlayersDeleted}`);
  } else {
    console.log(
      "  Tip: add --players to also remove ds32-p###@gudgame.local accounts.",
    );
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
