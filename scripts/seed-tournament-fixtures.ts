/**
 * Dev-only: Official FREE QA matrix (Original + Custom × formats × scoring).
 *
 * Usage:
 *   npm run db:seed:fixtures -- --name you@example.com
 * Always purges prior QA/legacy seed tournaments + dummy players, then recreates
 * the Official FREE matrix as **upcoming** (no duplicate slugs).
 * `--go-live` is local-only. Production/CI must never run this script.
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { closeDatabase } from "@/db/client";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  LEGACY_SEED_TOURNAMENT_SLUGS,
  QA_SEED_EMAIL_PREFIX,
  QA_SEED_TEAM_PREFIX,
  QA_TEAM_COUNT,
  SCORING_LABEL,
  buildMatchScoring,
  listOfficialFreeQaFixtures,
  type OfficialFreeQaFixtureDef,
} from "@/lib/dev/official-free-qa-fixtures";
import {
  DEFAULT_SEED_PASSWORD,
  PLAYERS_PER_TEAM,
  assertDevOnlySeed,
  assertIdempotentEnsure,
  deleteAllGudgameLocalSeedPlayers,
  ensureSeedPlayers,
  insertConfirmedTeams,
  isDeployFixtureSeedMode,
  normalizeEnv,
  parseCreatorEmail,
  purgeTournamentsBySlugLike,
  purgeTournamentsBySlugs,
  resolveCreatorUser,
  resolveFirstOfficialCreator,
  resolveSport,
  takeFlagValue,
} from "@/lib/dev/seed-tournament-fixtures";
import { logger } from "@/lib/logger";
import {
  createTournament,
  getTournamentBySlug,
  updateTournament,
} from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

const log = logger.child({ script: "seed-official-free-qa" });

const DEFAULT_SPORT_SLUG = "padel";
const PLAYER_COUNT = QA_TEAM_COUNT * PLAYERS_PER_TEAM;

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

  if (opts.ensure) opts.reset = false;
  return opts;
}

function buildUpsertInput(opts: {
  def: OfficialFreeQaFixtureDef;
  status: "upcoming" | "live";
  startsAt: Date;
  endsAt: Date;
}) {
  const { def } = opts;
  const regOpen = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const regClose = new Date(opts.startsAt.getTime() - 60 * 60 * 1000);
  const matchScoring = buildMatchScoring(def.format, def.scoringKey);
  const isGroup = def.format === "double_stage" || def.format === "group_only";
  const isLobby = def.format === "americano" || def.format === "mexicano";

  const payload = {
    name: def.name,
    slug: def.slug,
    summary: `Official free QA · ${def.formatFamily} · ${def.format} · ${SCORING_LABEL[def.scoringKey]} · ${QA_TEAM_COUNT} teams · No Rank.`,
    description:
      "<p>Seeded Official <strong>free</strong> fixture for Gud Game manual QA. Shared dummy players: <code>qa-p001@gudgame.local</code> …</p>",
    status: opts.status,
    tournamentType: "official" as const,
    officialBilling: "free" as const,
    registrationFeeIdr: 0,
    categoryLabel: "Mix" as const,
    format: def.format,
    formatFamily: def.formatFamily,
    rankingMode: "open" as const,
    allowedTierLevels: [] as [],
    matchScoring,
    venue: "Gud Game QA Courts",
    maxTeams: QA_TEAM_COUNT,
    playersPerTeam: PLAYERS_PER_TEAM,
    courtCount: isLobby ? 4 : 2,
    startsAt: opts.startsAt.toISOString(),
    endsAt: opts.endsAt.toISOString(),
    registrationOpensAt: regOpen.toISOString(),
    registrationClosesAt: regClose.toISOString(),
    scoringType: "points" as const,
    pointsPerMatch: 21,
    ...(isGroup
      ? {
          maxTeamsPerGroup: 4,
          teamsAdvancePerGroup: def.format === "double_stage" ? 2 : undefined,
        }
      : {}),
    ...(def.format === "mexicano"
      ? { mexicano: { mode: "team" as const, roundCount: 4 }, maxRounds: 4 }
      : {}),
    ...(def.format === "americano" ? { maxRounds: 4 } : {}),
    ...(def.formatFamily === "custom"
      ? {
          customMatch: {
            groupMeetingsPerPair: isGroup ? 2 : 1,
            knockoutLegsPerSlot:
              def.format === "double_stage" || def.format === "single_elimination"
                ? 3
                : 1,
          },
        }
      : {}),
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
  def: OfficialFreeQaFixtureDef;
  playerIds: string[];
  goLive: boolean;
}) {
  const { def } = input;
  const leftover = await getTournamentBySlug(input.sport.slug, def.slug);
  if (leftover) {
    await purgeTournamentsBySlugs({
      sportId: input.sport.id,
      slugs: [def.slug],
    });
  }

  const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const created = await createTournament(
    input.sport.id,
    input.creatorUserId,
    buildUpsertInput({ def, status: "upcoming", startsAt, endsAt }),
  );

  if (created.slug !== def.slug) {
    throw new Error(
      `Refusing duplicate slug for ${def.key}: expected ${def.slug}, created ${created.slug}. Purge leftover fixtures first.`,
    );
  }
  if (!input.goLive && created.status !== "upcoming") {
    throw new Error(
      `Expected upcoming status for ${def.slug}, got ${created.status}.`,
    );
  }

  await insertConfirmedTeams({
    tournamentId: created.id,
    playerIds: input.playerIds,
    teamCount: QA_TEAM_COUNT,
    teamNamePrefix: QA_SEED_TEAM_PREFIX,
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

async function purgePreviousSeedTournaments(sportId: string): Promise<void> {
  const legacy = await purgeTournamentsBySlugs({
    sportId,
    slugs: [...LEGACY_SEED_TOURNAMENT_SLUGS],
  });
  const qa = await purgeTournamentsBySlugLike({ sportId, pattern: "qa-free-%" });
  const dev = await purgeTournamentsBySlugLike({ sportId, pattern: "dev-%" });
  console.log(
    `[seed-qa] Purged tournaments: legacy=${legacy.removed} qa=${qa.removed} dev=${dev.removed}`,
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  assertDevOnlySeed("seed-official-free-qa", {
    allowDeployEnsure: opts.ensure || isDeployFixtureSeedMode(),
  });
  assertIdempotentEnsure("seed-official-free-qa", opts.reset);

  const password =
    normalizeEnv(process.env.SEED_FIXTURE_PASSWORD) ||
    normalizeEnv(process.env.SEED_DOUBLE_STAGE_PASSWORD) ||
    DEFAULT_SEED_PASSWORD;

  const fixtures = listOfficialFreeQaFixtures();
  const sport = await resolveSport(opts.sportSlug);

  let creator: Awaited<ReturnType<typeof resolveCreatorUser>>;
  try {
    if (opts.creatorEmail) {
      creator = await resolveCreatorUser(opts.creatorEmail);
    } else {
      const fallback = await resolveFirstOfficialCreator();
      if (!fallback) {
        if (opts.ensure || isDeployFixtureSeedMode()) {
          console.warn("[seed-qa] Ensure mode: no host/super_admin found — skipping.");
          await closeDatabase();
          return;
        }
        throw new Error(
          "Creator email is required (or register a host first).\n" +
            "  npm run db:seed:fixtures -- --name you@example.com --reset",
        );
      }
      creator = fallback;
      console.log(`[seed-qa] Using first host/super_admin: ${creator.email}`);
    }
  } catch (err) {
    if (opts.ensure || isDeployFixtureSeedMode()) {
      console.warn(
        `[seed-qa] Ensure mode: ${err instanceof Error ? err.message : String(err)} — skipping.`,
      );
      await closeDatabase();
      return;
    }
    throw err;
  }

  console.log("[seed-qa] Official FREE matrix (Original + Custom × scoring)…");
  console.log(
    `[seed-qa] creator=${creator.email} sport=${opts.sportSlug} events=${fixtures.length} refresh=${!opts.ensure} goLive=${opts.goLive}`,
  );

  if (opts.ensure) {
    console.log("[seed-qa] Ensure mode: skip purge (create-if-missing only).");
  } else {
    await purgePreviousSeedTournaments(sport.id);
    const playersDeleted = await deleteAllGudgameLocalSeedPlayers();
    console.log(`[seed-qa] Seed players deleted: ${playersDeleted}`);
  }

  const playerIds = await ensureSeedPlayers({
    emailPrefix: QA_SEED_EMAIL_PREFIX,
    displayPrefix: "QA Player",
    count: PLAYER_COUNT,
    password,
  });

  const results: Array<{
    key: string;
    slug: string;
    status: string;
    manageUrl: string;
    publicUrl: string;
  }> = [];

  for (const def of fixtures) {
    const existing = await getTournamentBySlug(sport.slug, def.slug);
    if (existing && opts.ensure) {
      console.log(`[seed-qa] Skip ${def.key}: already exists.`);
      results.push({
        key: def.key,
        slug: existing.slug,
        status: existing.status,
        manageUrl: publicSportRoutes.tournamentManage(sport.slug, existing.slug),
        publicUrl: publicSportRoutes.tournament(sport.slug, existing.slug),
      });
      continue;
    }
    if (existing && !opts.ensure) {
      await purgeTournamentsBySlugs({ sportId: sport.id, slugs: [def.slug] });
    }

    console.log(`[seed-qa] Creating ${def.key}…`);
    const seeded = await seedOneFixture({
      sport,
      creatorUserId: creator.userId,
      def,
      playerIds,
      goLive: opts.goLive,
    });
    results.push({ key: def.key, ...seeded });
  }

  const slugs = results.map((r) => r.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("Duplicate tournament slugs in QA seed output.");
  }
  if (!opts.goLive) {
    const notUpcoming = results.filter((r) => r.status !== "upcoming");
    if (notUpcoming.length) {
      throw new Error(
        `QA fixtures must be upcoming; got: ${notUpcoming.map((r) => `${r.slug}=${r.status}`).join(", ")}`,
      );
    }
  }

  console.log("");
  console.log("────────────────────────────────────────────────────────");
  console.log(" Official FREE QA fixtures ready");
  console.log("────────────────────────────────────────────────────────");
  console.log(` Host:        ${creator.email}`);
  console.log(
    ` Players:     ${QA_SEED_EMAIL_PREFIX}001@gudgame.local … ${String(PLAYER_COUNT).padStart(3, "0")}`,
  );
  console.log(` Password:    ${password}`);
  console.log(` Ranking:     No Rank (open) · billing: free`);
  console.log(` Teams/event: ${QA_TEAM_COUNT}`);
  console.log(` Events:      ${results.length}`);
  for (const row of results) {
    console.log(`  ${row.status.padEnd(9)}  ${row.slug}`);
    console.log(`           ${row.manageUrl}`);
  }
  console.log("");
  console.log(" Purge: npm run db:seed:fixtures:purge -- --players");
  console.log("────────────────────────────────────────────────────────");

  log.info("Official free QA seed complete", {
    creatorEmail: creator.email,
    count: results.length,
  });

  await closeDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  log.error("Official free QA seed failed", err);
  console.error("[seed-qa] Failed:", err instanceof Error ? err.message : String(err));
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
