/**
 * Dev/staging: remove partner Bestie Cup dry-run fixture.
 *
 * Usage:
 *   npm run db:seed:partner-bestie-cup:purge
 *   npm run db:seed:partner-bestie-cup:purge -- --partner-slug spark-area --players
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { assertDevOnlySeed, normalizeEnv, resolveSport, takeFlagValue } from "@/lib/dev/seed-tournament-fixtures";
import {
  BESTIE_CUP_FIXTURE_SLUG,
  purgePartnerBestieCupFixture,
} from "@/lib/dev/partner-bestie-cup-fixture";
import { getPartnerBySlug } from "@/lib/partners/service";
import { closeDatabase } from "@/db/client";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "purge-partner-bestie-cup" });

type CliOptions = {
  sportSlug: string;
  partnerSlug: string;
  tournamentSlug: string;
  purgeFixturePlayers: boolean;
};

function parsePartnerSlug(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    const slug = takeFlagValue(argv, i, "--partner-slug");
    if (slug != null) return slug.trim().toLowerCase();
  }
  return (
    normalizeEnv(process.env.SEED_BESTIE_CUP_PARTNER_SLUG).toLowerCase() ||
    "spark-area"
  );
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    sportSlug: "padel",
    partnerSlug: parsePartnerSlug(argv),
    tournamentSlug: BESTIE_CUP_FIXTURE_SLUG,
    purgeFixturePlayers: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--players" || arg === "--purge-players") {
      opts.purgeFixturePlayers = true;
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
      opts.tournamentSlug = slug || BESTIE_CUP_FIXTURE_SLUG;
      if (arg === "--slug") i += 1;
    }
  }

  return opts;
}

async function main(): Promise<void> {
  assertDevOnlySeed("purge-partner-bestie-cup");
  const opts = parseArgs(process.argv.slice(2));

  console.log(
    `[purge-partner-bestie-cup] partner=${opts.partnerSlug} slug=${opts.tournamentSlug} players=${opts.purgeFixturePlayers}`,
  );

  const partner = await getPartnerBySlug(opts.partnerSlug);
  if (!partner) {
    throw new Error(`Partner "${opts.partnerSlug}" not found.`);
  }

  const sport = await resolveSport(opts.sportSlug);
  const result = await purgePartnerBestieCupFixture({
    sportId: sport.id,
    partnerId: partner.id,
    tournamentSlug: opts.tournamentSlug,
    purgeFixturePlayers: opts.purgeFixturePlayers,
  });

  console.log(
    `[purge-partner-bestie-cup] removed=${result.removed} payments=${result.paymentsDeleted} players=${result.fixturePlayersDeleted}`,
  );

  log.info("Partner Bestie Cup purge complete", result);
  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Partner Bestie Cup purge failed", err);
  console.error(
    "[purge-partner-bestie-cup] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
