/**
 * Dev-only: format matrix fixtures for Official (paid/free) + Fun Match.
 *
 * Creates:
 *   - Official free  · Americano
 *   - Official paid  · Americano
 *   - Official free  · Elimination
 *   - Official paid  · Elimination
 *   - Fun Match      · Americano
 *   - Fun Match      · Elimination
 *
 * Official fixtures use Gold tier (±5) with 16 confirmed teams.
 * Fun Match has no tier gate; 16 confirmed squads.
 *
 * Usage:
 *   npm run db:seed:fixtures -- --name juwonoindonesia@gmail.com
 *   npm run db:seed:fixtures -- --name you@example.com --reset
 *   npm run db:seed:fixtures -- --name you@example.com --go-live
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { closeDatabase } from "@/db/client";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  DEFAULT_SEED_PASSWORD,
  FORMAT_FIXTURE_TEAM_COUNT,
  FORMAT_FIXTURES,
  PLAYERS_PER_TEAM,
  assertDevOnlySeed,
  assertIdempotentEnsure,
  ensureSeedPlayers,
  insertConfirmedTeams,
  isDeployFixtureSeedMode,
  normalizeEnv,
  parseCreatorEmail,
  purgeTournamentsBySlugs,
  resolveCreatorUser,
  resolveSport,
  seedPlayerTierPoints,
  takeFlagValue,
  type FormatFixtureDef,
} from "@/lib/dev/seed-tournament-fixtures";
import { logger } from "@/lib/logger";
import type { PlayerTierLevel } from "@/lib/player/tier";
import {
  createTournament,
  getTournamentBySlug,
  updateTournament,
} from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

const log = logger.child({ script: "seed-tournament-fixtures" });

const DEFAULT_SPORT_SLUG = "padel";
const OFFICIAL_TIER: PlayerTierLevel = "gold";
const PLAYER_COUNT = FORMAT_FIXTURE_TEAM_COUNT * PLAYERS_PER_TEAM;

type FixtureDef = FormatFixtureDef;

type CliOptions = {
  reset: boolean;
  goLive: boolean;
  ensure: boolean;
  sportSlug: string;
  creatorEmail: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    reset: false,
    goLive: false,
    ensure: isDeployFixtureSeedMode(),
    sportSlug: DEFAULT_SPORT_SLUG,
    creatorEmail: parseCreatorEmail(argv),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--reset") {
      opts.reset = true;
      continue;
    }
    if (arg === "--ensure") {
      opts.ensure = true;
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
    }
  }

  if (opts.ensure) {
    opts.reset = false;
  }

  return opts;
}

function buildUpsertInput(opts: {
  def: FixtureDef;
  status: "upcoming" | "live";
  startsAt: Date;
  endsAt: Date;
}) {
  const { def } = opts;
  const regOpen = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const regClose = new Date(opts.startsAt.getTime() - 60 * 60 * 1000);
  const isOfficial = def.tournamentType === "official";

  const base = {
    name: def.name,
    slug: def.slug,
    summary: isOfficial
      ? `Dev fixture: official ${def.billing} · ${def.format} · Gold tier · ${FORMAT_FIXTURE_TEAM_COUNT} teams.`
      : `Dev fixture: Fun Match · ${def.format} · open to all tiers · ${FORMAT_FIXTURE_TEAM_COUNT} squads. No ranking impact.`,
    description:
      "<p>Seeded by <code>npm run db:seed:fixtures</code> for format / billing / Fun Match QA.</p>",
    status: opts.status,
    tournamentType: def.tournamentType,
    format: def.format,
    venue: "Gud Game Dev Courts",
    maxTeams: FORMAT_FIXTURE_TEAM_COUNT,
    playersPerTeam: PLAYERS_PER_TEAM,
    courtCount: def.format === "americano" ? 4 : 2,
    startsAt: opts.startsAt.toISOString(),
    endsAt: opts.endsAt.toISOString(),
    registrationOpensAt: regOpen.toISOString(),
    registrationClosesAt: regClose.toISOString(),
    scoringType: "points" as const,
    pointsPerMatch: 21,
  };

  const payload = isOfficial
    ? {
        ...base,
        officialBilling: def.billing,
        registrationFeeIdr: def.billing === "paid" ? 125_000 : 0,
        categoryLabel: "Mix" as const,
        allowedTierLevels: [OFFICIAL_TIER],
        ...(def.format === "single_elimination"
          ? { thirdPlaceEnabled: false }
          : {}),
      }
    : {
        ...base,
        officialBilling: null,
        registrationFeeIdr: 0,
        allowedTierLevels: [],
        maxRounds: def.format === "americano" ? 4 : undefined,
      };

  const parsed = tournamentUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Invalid payload for ${def.slug}: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
  return parsed.data;
}

async function seedOneFixture(input: {
  sport: { id: string; slug: string };
  creatorUserId: string;
  def: FixtureDef;
  password: string;
  goLive: boolean;
}): Promise<{
  slug: string;
  status: string;
  manageUrl: string;
  publicUrl: string;
}> {
  const { def } = input;
  const playerIds = await ensureSeedPlayers({
    emailPrefix: def.emailPrefix,
    displayPrefix: def.teamPrefix.replace(/ Team| Squad/g, " P"),
    count: PLAYER_COUNT,
    password: input.password,
  });

  if (def.tournamentType === "official") {
    await seedPlayerTierPoints({
      userIds: playerIds,
      sportId: input.sport.id,
      targetTier: OFFICIAL_TIER,
    });
  }

  const startsAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

  const created = await createTournament(
    input.sport.id,
    input.creatorUserId,
    buildUpsertInput({ def, status: "upcoming", startsAt, endsAt }),
  );

  await insertConfirmedTeams({
    tournamentId: created.id,
    playerIds,
    teamCount: FORMAT_FIXTURE_TEAM_COUNT,
    teamNamePrefix: def.teamPrefix,
  });

  let final = created;
  if (input.goLive) {
    const liveStarts = new Date();
    const liveEnds = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    final = await updateTournament(
      created.id,
      input.sport.id,
      buildUpsertInput({
        def,
        status: "live",
        startsAt: liveStarts,
        endsAt: liveEnds,
      }),
    );
  }

  return {
    slug: final.slug,
    status: final.status,
    manageUrl: publicSportRoutes.tournamentManage(input.sport.slug, final.slug),
    publicUrl: publicSportRoutes.tournament(input.sport.slug, final.slug),
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  assertDevOnlySeed("seed-fixtures", {
    allowDeployEnsure: opts.ensure || isDeployFixtureSeedMode(),
  });
  assertIdempotentEnsure("seed-fixtures", opts.reset);

  if (!opts.creatorEmail) {
    if (opts.ensure || isDeployFixtureSeedMode()) {
      console.warn(
        "[seed-fixtures] Ensure mode: creator email missing — skipping fixture seed (deploy continues).",
      );
      await closeDatabase();
      return;
    }
    throw new Error(
      "Creator email is required.\n" +
        "  npm run db:seed:fixtures -- --name juwonoindonesia@gmail.com",
    );
  }

  const password =
    normalizeEnv(process.env.SEED_FIXTURE_PASSWORD) ||
    normalizeEnv(process.env.SEED_DOUBLE_STAGE_PASSWORD) ||
    DEFAULT_SEED_PASSWORD;

  console.log("[seed-fixtures] Starting format matrix…");
  console.log(
    `[seed-fixtures] creator=${opts.creatorEmail} sport=${opts.sportSlug} reset=${opts.reset} ensure=${opts.ensure} goLive=${opts.goLive}`,
  );

  const sport = await resolveSport(opts.sportSlug);

  let creator: Awaited<ReturnType<typeof resolveCreatorUser>>;
  try {
    creator = await resolveCreatorUser(opts.creatorEmail);
  } catch (err) {
    if (opts.ensure || isDeployFixtureSeedMode()) {
      console.warn(
        `[seed-fixtures] Ensure mode: ${err instanceof Error ? err.message : String(err)} — skipping (deploy continues).`,
      );
      await closeDatabase();
      return;
    }
    throw err;
  }

  if (opts.reset) {
    const { removed, paymentsDeleted } = await purgeTournamentsBySlugs({
      sportId: sport.id,
      slugs: FORMAT_FIXTURES.map((f) => f.slug),
    });
    console.log(
      `[seed-fixtures] Reset: removed ${removed} tournament(s), payments=${paymentsDeleted}`,
    );
  }

  const results: Array<{
    key: string;
    slug: string;
    status: string;
    manageUrl: string;
    publicUrl: string;
    emailPrefix: string;
  }> = [];

  for (const def of FORMAT_FIXTURES) {
    const existing = await getTournamentBySlug(sport.slug, def.slug);
    if (existing && !opts.reset) {
      console.log(`[seed-fixtures] Skip ${def.key}: already exists (${def.slug}). Use --reset.`);
      results.push({
        key: def.key,
        slug: existing.slug,
        status: existing.status,
        manageUrl: publicSportRoutes.tournamentManage(sport.slug, existing.slug),
        publicUrl: publicSportRoutes.tournament(sport.slug, existing.slug),
        emailPrefix: def.emailPrefix,
      });
      continue;
    }

    console.log(`[seed-fixtures] Creating ${def.key}…`);
    const seeded = await seedOneFixture({
      sport,
      creatorUserId: creator.userId,
      def,
      password,
      goLive: opts.goLive,
    });
    results.push({ key: def.key, emailPrefix: def.emailPrefix, ...seeded });
  }

  console.log("");
  console.log("────────────────────────────────────────────────────────");
  console.log(" Format fixtures ready (Official + Fun Match)");
  console.log("────────────────────────────────────────────────────────");
  console.log(` Creator:     ${creator.email}`);
  console.log(` Player pass: ${password}`);
  console.log(` Official tier for eligibility: Gold (±5)`);
  console.log(` Teams per event: ${FORMAT_FIXTURE_TEAM_COUNT}`);
  for (const row of results) {
    console.log("");
    console.log(` ${row.key}`);
    console.log(`   status:  ${row.status}`);
    console.log(`   players: ${row.emailPrefix}001@gudgame.local …`);
    console.log(`   manage:  ${row.manageUrl}`);
    console.log(`   public:  ${row.publicUrl}`);
  }
  console.log("");
  console.log(" Purge: npm run db:seed:fixtures:purge");
  console.log(" Purge+players: npm run db:seed:fixtures:purge -- --players");
  console.log("────────────────────────────────────────────────────────");

  log.info("Format fixtures seed complete", {
    creatorEmail: creator.email,
    keys: results.map((r) => r.key),
  });

  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Format fixtures seed failed", err);
  console.error(
    "[seed-fixtures] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
