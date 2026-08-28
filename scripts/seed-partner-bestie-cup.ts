/**
 * Local development ONLY: seed partner Bestie Cup 2026 dry-run (48 confirmed pairs, upcoming).
 * Never runs in CI/production deploy. No registration emails for dummy players.
 *
 * Usage:
 *   npm run db:seed:partner-bestie-cup -- --name japanonigiri136@gmail.com --partner-slug spark-area
 *   npm run db:seed:partner-bestie-cup -- --name you@example.com --reset
 *   npm run db:seed:partner-bestie-cup -- --name you@example.com --go-live
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import {
  assertDevOnlySeed,
  normalizeEnv,
  parseCreatorEmail,
  resolveCreatorUser,
  resolveSport,
  takeFlagValue,
} from "@/lib/dev/seed-tournament-fixtures";
import {
  BESTIE_CUP_FIXTURE_SLUG,
  BESTIE_CUP_FIXTURE_TOURNAMENT_NAME,
  assertPartnerBestieCupLocalDevOnly,
  seedPartnerBestieCupFixture,
  purgePartnerBestieCupFixture,
} from "@/lib/dev/partner-bestie-cup-fixture";
import { getPartnerBySlug } from "@/lib/partners/service";
import { closeDatabase } from "@/db/client";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "seed-partner-bestie-cup" });

const DEFAULT_SPORT_SLUG = "padel";

type CliOptions = {
  reset: boolean;
  goLive: boolean;
  sportSlug: string;
  partnerSlug: string;
  creatorEmail: string | null;
  tournamentSlug: string;
  tournamentName: string;
};

function parsePartnerSlug(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    const slug = takeFlagValue(argv, i, "--partner-slug");
    if (slug != null) return slug.trim().toLowerCase();
    const legacy = takeFlagValue(argv, i, "--partner");
    if (legacy != null) return legacy.trim().toLowerCase();
  }
  return (
    normalizeEnv(process.env.SEED_BESTIE_CUP_PARTNER_SLUG).toLowerCase() ||
    normalizeEnv(process.env.SEED_PARTNER_SLUG).toLowerCase() ||
    "spark-area"
  );
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    reset: false,
    goLive: false,
    sportSlug: DEFAULT_SPORT_SLUG,
    partnerSlug: parsePartnerSlug(argv),
    creatorEmail: parseCreatorEmail(argv),
    tournamentSlug: BESTIE_CUP_FIXTURE_SLUG,
    tournamentName: BESTIE_CUP_FIXTURE_TOURNAMENT_NAME,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--reset") {
      opts.reset = true;
      continue;
    }
    if (arg === "--go-live") {
      opts.goLive = true;
      continue;
    }

    const sport = takeFlagValue(argv, i, "--sport");
    if (sport != null) {
      opts.sportSlug = sport || DEFAULT_SPORT_SLUG;
      if (arg === "--sport") i += 1;
      continue;
    }

    const slug = takeFlagValue(argv, i, "--slug");
    if (slug != null) {
      opts.tournamentSlug = slug || BESTIE_CUP_FIXTURE_SLUG;
      if (arg === "--slug") i += 1;
      continue;
    }

    const name = takeFlagValue(argv, i, "--tournament-name");
    if (name != null) {
      opts.tournamentName = name || BESTIE_CUP_FIXTURE_TOURNAMENT_NAME;
      if (arg === "--tournament-name") i += 1;
    }
  }

  return opts;
}

async function main(): Promise<void> {
  assertPartnerBestieCupLocalDevOnly("seed-partner-bestie-cup");
  assertDevOnlySeed("seed-partner-bestie-cup");

  const opts = parseArgs(process.argv.slice(2));

  if (!opts.creatorEmail) {
    throw new Error(
      "Creator email is required (partner owner/staff with dashboard access).\n" +
        "  npm run db:seed:partner-bestie-cup -- --name you@example.com --partner-slug spark-area",
    );
  }

  console.log("[seed-partner-bestie-cup] Starting Bestie Cup dry-run fixture (local dev only)…");
  console.log(
    `[seed-partner-bestie-cup] creator=${opts.creatorEmail} partner=${opts.partnerSlug} sport=${opts.sportSlug} reset=${opts.reset} goLive=${opts.goLive}`,
  );

  const partner = await getPartnerBySlug(opts.partnerSlug);
  if (!partner) {
    throw new Error(`Partner slug "${opts.partnerSlug}" not found.`);
  }

  const sport = await resolveSport(opts.sportSlug);
  const creator = await resolveCreatorUser(opts.creatorEmail);

  if (opts.reset) {
    await purgePartnerBestieCupFixture({
      sportId: sport.id,
      partnerId: partner.id,
      tournamentSlug: opts.tournamentSlug,
      purgeFixturePlayers: false,
    });
    console.log("[seed-partner-bestie-cup] Reset: previous fixture removed.");
  }

  const result = await seedPartnerBestieCupFixture({
    partnerSlug: opts.partnerSlug,
    creatorUserId: creator.userId,
    sport,
    reset: false,
    goLive: opts.goLive,
    tournamentSlug: opts.tournamentSlug,
    tournamentName: opts.tournamentName,
  });

  console.log("");
  console.log("────────────────────────────────────────────────────────");
  console.log(" Bestie Cup 2026 · partner dry-run fixture (local dev)");
  console.log("────────────────────────────────────────────────────────");
  console.log(` Partner:     ${result.partnerSlug}`);
  console.log(` Creator:     ${creator.email}`);
  console.log(` Tournament:  ${result.tournament.name}`);
  console.log(` Slug:        ${result.tournament.slug}`);
  console.log(` Status:      ${result.tournament.status}`);
  console.log(` Teams:       ${result.confirmedPairs} confirmed pairs (no emails sent)`);
  console.log(` Manage:      ${result.manageUrl}`);
  console.log(` Public:      ${result.publicUrl}`);
  console.log(` Register:    ${result.registerUrl}`);
  console.log("");
  console.log(" Pool A (PDF examples): Sinta/Eka · Arin/Indri · Voni/Septi");
  console.log(" Next: open Manage → verify 48 teams → set Live → Groups sync");
  console.log("");
  console.log(" Purge: npm run db:seed:partner-bestie-cup:purge");
  console.log("────────────────────────────────────────────────────────");

  log.info("Partner Bestie Cup seed complete", {
    partnerSlug: result.partnerSlug,
    slug: result.tournament.slug,
    status: result.tournament.status,
    teams: result.confirmedPairs,
  });

  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Partner Bestie Cup seed failed", err);
  console.error(
    "[seed-partner-bestie-cup] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
