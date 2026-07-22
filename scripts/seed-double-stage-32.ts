/**
 * Dev-only: official Double Stage fixtures — one tournament per skill tier (32 teams each).
 *
 * Usage:
 *   npm run db:seed:double-stage -- --name juwonoindonesia@gmail.com
 *   npm run db:seed:double-stage -- --name you@example.com --reset
 *   npm run db:seed:double-stage -- --name you@example.com --tier=gold --go-live
 *   npm run db:seed:double-stage -- --name you@example.com --reset --go-live
 *
 * Creates 5 tournaments by default (Bronze → International/National), each with
 * 32 confirmed Mix teams and players ranked at that exact tier for eligibility tests.
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  ALL_SKILL_TIERS,
  DOUBLE_STAGE_TEAM_COUNT,
  DEFAULT_SEED_PASSWORD,
  PLAYERS_PER_TEAM,
  assertDevOnlySeed,
  assertIdempotentEnsure,
  doubleStagePlayerPrefix,
  doubleStageSlugForTier,
  ensureSeedPlayers,
  insertConfirmedTeams,
  isDeployFixtureSeedMode,
  normalizeEnv,
  parseCreatorEmail,
  resolveCreatorUser,
  resolveSport,
  seedPlayerTierPoints,
  takeFlagValue,
  tierMatchPointsLabel,
} from "@/lib/dev/seed-tournament-fixtures";
import { purgeDoubleStageFixture } from "@/lib/dev/purge-double-stage-fixture";
import { closeDatabase } from "@/db/client";
import { logger } from "@/lib/logger";
import {
  PLAYER_TIER_LABELS,
  TOURNAMENT_TIER_MATCH_POINTS,
  normalizePlayerTier,
  type PlayerTierLevel,
} from "@/lib/player/tier";
import {
  createTournament,
  getTournamentBySlug,
  updateTournament,
} from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

const log = logger.child({ script: "seed-double-stage-32" });

const DEFAULT_SPORT_SLUG = "padel";
const PLAYER_COUNT = DOUBLE_STAGE_TEAM_COUNT * PLAYERS_PER_TEAM;

type CliOptions = {
  reset: boolean;
  goLive: boolean;
  /** Idempotent create-if-missing (deploy-safe; never deletes). */
  ensure: boolean;
  sportSlug: string;
  creatorEmail: string | null;
  /** When set, only seed this tier; otherwise all tiers. */
  onlyTier: PlayerTierLevel | null;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    reset: false,
    goLive: false,
    ensure: isDeployFixtureSeedMode(),
    sportSlug: DEFAULT_SPORT_SLUG,
    creatorEmail: parseCreatorEmail(argv),
    onlyTier: null,
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
      continue;
    }

    const tierRaw = takeFlagValue(argv, i, "--tier");
    if (tierRaw != null) {
      const tier = normalizePlayerTier(tierRaw);
      if (!tier) {
        throw new Error(
          `Unknown --tier "${tierRaw}". Use: ${ALL_SKILL_TIERS.join(", ")}`,
        );
      }
      opts.onlyTier = tier;
      if (arg === "--tier") i += 1;
    }
  }

  // Deploy / --ensure must never reset.
  if (opts.ensure) {
    opts.reset = false;
  }

  return opts;
}

function buildUpsertInput(opts: {
  name: string;
  slug: string;
  tier: PlayerTierLevel;
  status: "upcoming" | "live";
  startsAt: Date;
  endsAt: Date;
  billing: "free" | "paid";
  feeIdr?: number;
}) {
  const regOpen = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const regClose = new Date(opts.startsAt.getTime() - 60 * 60 * 1000);
  const tierLabel = PLAYER_TIER_LABELS[opts.tier];

  const parsed = tournamentUpsertSchema.safeParse({
    name: opts.name,
    slug: opts.slug,
    summary: `Dev fixture: official ${opts.billing} Double Stage · ${tierLabel} (${tierMatchPointsLabel(opts.tier)} pts) · 32 Mix teams.`,
    description:
      "<p>Seeded by <code>npm run db:seed:double-stage</code>. Players are ranked at this tournament tier for eligibility testing. Use manage UI to score groups and advance to knockout.</p>",
    status: opts.status,
    tournamentType: "official",
    officialBilling: opts.billing,
    registrationFeeIdr: opts.billing === "paid" ? (opts.feeIdr ?? 150_000) : 0,
    format: "double_stage",
    categoryLabel: "Mix",
    allowedTierLevels: [opts.tier],
    venue: "Gud Game Dev Courts",
    maxTeams: DOUBLE_STAGE_TEAM_COUNT,
    playersPerTeam: PLAYERS_PER_TEAM,
    courtCount: 4,
    maxTeamsPerGroup: 4,
    teamsAdvancePerGroup: 2,
    thirdPlaceEnabled: false,
    allowDraw: false,
    matchScoreMode: "games",
    raceToGames: 4,
    winPoints: TOURNAMENT_TIER_MATCH_POINTS[opts.tier],
    drawPoints: 0,
    lossPoints: 0,
    registrationOpensAt: regOpen.toISOString(),
    registrationClosesAt: regClose.toISOString(),
    startsAt: opts.startsAt.toISOString(),
    endsAt: opts.endsAt.toISOString(),
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid tournament payload: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
  return parsed.data;
}

async function seedOneTier(input: {
  sport: { id: string; slug: string };
  creatorUserId: string;
  tier: PlayerTierLevel;
  password: string;
  goLive: boolean;
  billing: "free" | "paid";
}): Promise<{
  slug: string;
  status: string;
  manageUrl: string;
  publicUrl: string;
}> {
  const slug = doubleStageSlugForTier(input.tier);
  const label = PLAYER_TIER_LABELS[input.tier];
  const emailPrefix = doubleStagePlayerPrefix(input.tier);

  const playerIds = await ensureSeedPlayers({
    emailPrefix,
    displayPrefix: `DS ${label}`,
    count: PLAYER_COUNT,
    password: input.password,
  });

  await seedPlayerTierPoints({
    userIds: playerIds,
    sportId: input.sport.id,
    targetTier: input.tier,
  });

  const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const created = await createTournament(
    input.sport.id,
    input.creatorUserId,
    buildUpsertInput({
      name: `Dev DS 32 · ${label}`,
      slug,
      tier: input.tier,
      status: "upcoming",
      startsAt,
      endsAt,
      billing: input.billing,
    }),
  );

  await insertConfirmedTeams({
    tournamentId: created.id,
    playerIds,
    teamCount: DOUBLE_STAGE_TEAM_COUNT,
    teamNamePrefix: `${label.slice(0, 3).toUpperCase()} Team`,
  });

  let final = created;
  if (input.goLive) {
    const liveStarts = new Date();
    const liveEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    final = await updateTournament(
      created.id,
      input.sport.id,
      buildUpsertInput({
        name: created.name,
        slug: created.slug,
        tier: input.tier,
        status: "live",
        startsAt: liveStarts,
        endsAt: liveEnds,
        billing: input.billing,
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
  assertDevOnlySeed("seed-double-stage", {
    allowDeployEnsure: opts.ensure || isDeployFixtureSeedMode(),
  });
  assertIdempotentEnsure("seed-double-stage", opts.reset);

  if (!opts.creatorEmail) {
    if (opts.ensure || isDeployFixtureSeedMode()) {
      console.warn(
        "[seed-double-stage] Ensure mode: creator email missing — skipping fixture seed (deploy continues).",
      );
      await closeDatabase();
      return;
    }
    throw new Error(
      "Creator email is required.\n" +
        "  npm run db:seed:double-stage -- --name juwonoindonesia@gmail.com",
    );
  }

  const password =
    normalizeEnv(process.env.SEED_DOUBLE_STAGE_PASSWORD) || DEFAULT_SEED_PASSWORD;
  const tiers = opts.onlyTier ? [opts.onlyTier] : [...ALL_SKILL_TIERS];

  console.log("[seed-double-stage] Starting multi-tier fixtures…");
  console.log(
    `[seed-double-stage] creator=${opts.creatorEmail} sport=${opts.sportSlug} tiers=${tiers.join(",")} reset=${opts.reset} ensure=${opts.ensure} goLive=${opts.goLive}`,
  );

  const sport = await resolveSport(opts.sportSlug);

  let creator: Awaited<ReturnType<typeof resolveCreatorUser>>;
  try {
    creator = await resolveCreatorUser(opts.creatorEmail);
  } catch (err) {
    if (opts.ensure || isDeployFixtureSeedMode()) {
      console.warn(
        `[seed-double-stage] Ensure mode: ${err instanceof Error ? err.message : String(err)} — skipping (deploy continues).`,
      );
      await closeDatabase();
      return;
    }
    throw err;
  }

  if (opts.reset) {
    await purgeDoubleStageFixture({
      sportId: sport.id,
      allTiers: !opts.onlyTier,
      tournamentSlug: opts.onlyTier
        ? doubleStageSlugForTier(opts.onlyTier)
        : undefined,
      purgeSeedPlayers: false,
    });
    console.log("[seed-double-stage] Reset: previous fixtures purged (players kept).");
  }

  const results: Array<{
    tier: PlayerTierLevel;
    slug: string;
    status: string;
    manageUrl: string;
    publicUrl: string;
  }> = [];

  for (const tier of tiers) {
    const slug = doubleStageSlugForTier(tier);
    const existing = await getTournamentBySlug(sport.slug, slug);
    if (existing && !opts.reset) {
      console.log(
        `[seed-double-stage] Skip ${tier}: already exists (${publicSportRoutes.tournamentManage(sport.slug, existing.slug)}). Use --reset.`,
      );
      results.push({
        tier,
        slug: existing.slug,
        status: existing.status,
        manageUrl: publicSportRoutes.tournamentManage(sport.slug, existing.slug),
        publicUrl: publicSportRoutes.tournament(sport.slug, existing.slug),
      });
      continue;
    }

    // Alternate free / paid for variety: bronze+silver+gold free; platinum+international paid
    const billing: "free" | "paid" =
      tier === "platinum" || tier === "international" ? "paid" : "free";

    console.log(
      `[seed-double-stage] Creating ${PLAYER_TIER_LABELS[tier]} (${billing}, ${DOUBLE_STAGE_TEAM_COUNT} teams)…`,
    );
    const seeded = await seedOneTier({
      sport,
      creatorUserId: creator.userId,
      tier,
      password,
      goLive: opts.goLive,
      billing,
    });
    results.push({ tier, ...seeded });
  }

  console.log("");
  console.log("────────────────────────────────────────────────────────");
  console.log(" Double Stage · per-tier fixtures ready");
  console.log("────────────────────────────────────────────────────────");
  console.log(` Creator:     ${creator.email} (${creator.roles.join(", ")})`);
  console.log(` Player pass: ${password}`);
  for (const row of results) {
    const prefix = doubleStagePlayerPrefix(row.tier);
    console.log("");
    console.log(
      ` ${PLAYER_TIER_LABELS[row.tier].padEnd(24)} ${row.status.padEnd(10)} ${tierMatchPointsLabel(row.tier)}`,
    );
    console.log(`   slug:    ${row.slug}`);
    console.log(`   players: ${prefix}001@gudgame.local … ${prefix}${String(PLAYER_COUNT).padStart(3, "0")}@gudgame.local`);
    console.log(`   manage:  ${row.manageUrl}`);
    console.log(`   public:  ${row.publicUrl}`);
  }
  console.log("");
  console.log(" Purge all:  npm run db:seed:double-stage:purge -- --all");
  console.log(" Purge+players: npm run db:seed:double-stage:purge -- --all --players");
  console.log("────────────────────────────────────────────────────────");

  log.info("Multi-tier double-stage seed complete", {
    creatorEmail: creator.email,
    tiers: results.map((r) => r.tier),
  });

  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Double-stage seed failed", err);
  console.error(
    "[seed-double-stage] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
